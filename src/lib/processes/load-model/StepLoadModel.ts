import { UI } from '../../UI.ts'
import { ZipGLTFLoader } from './ZipGLTFLoader.ts'
import { Box3 } from 'three/src/math/Box3.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'

import { Scene } from 'three/src/scenes/Scene.js'
import { Mesh } from 'three/src/objects/Mesh.js'
import { MeshNormalMaterial } from 'three/src/materials/MeshNormalMaterial.js'
import { MathUtils } from 'three/src/math/MathUtils.js'
import { FrontSide } from 'three/src/constants.js'
import { type BufferGeometry, type Material, type Object3D, type SkinnedMesh } from 'three'
import { ModalDialog } from '../../ModalDialog.ts'

// Note: EventTarget is a built-ininterface and do not need to import it
export class StepLoadModel extends EventTarget {
  private readonly gltf_loader = new GLTFLoader()
  private readonly fbx_loader = new FBXLoader()
  private readonly ui: UI = UI.getInstance()
  private original_model_data: Scene = new Scene()
  private final_mesh_data: Scene = new Scene()
  private debug_model_loading: boolean = false

  // there can be multiple objects in a model, so store them in a list
  private readonly geometry_list: BufferGeometry[] = []
  private readonly material_list: Material[] = []

  private _added_event_listeners: boolean = false

  // for debugging, let's count these to help us test performance things better
  vertex_count = 0
  triangle_count = 0
  objects_count = 0

  // function that goes through all our geometry data and calculates how many triangles we have
  private calculate_mesh_metrics (): void {
    let triangle_count = 0
    let vertex_count = 0

    // calculate all the loaded mesh data
    this.models_geometry_list().forEach((geometry) => {
      triangle_count += geometry.attributes.position.count / 3
      vertex_count += geometry.attributes.position.count
    })

    this.triangle_count = triangle_count
    this.vertex_count = vertex_count
    this.objects_count = this.models_geometry_list().length
  }

  private calculate_geometry_list (): void {
    if (this.final_mesh_data === undefined) {
      console.error('original model not loaded yet. Cannot do calculations')
    }

    // clear geometry and material list in case we run this again
    // this empties the array in place, and doesn't need to create a new array
    this.geometry_list.length = 0
    this.material_list.length = 0

    this.final_mesh_data.traverse((child: Object3D) => {
      if (child.type === 'Mesh') {
        const geometry_to_add: BufferGeometry = (child as Mesh).geometry.clone()
        geometry_to_add.name = child.name
        this.geometry_list.push(geometry_to_add)

        const new_material: Material = (child as Mesh).material.clone()
        this.material_list.push(new_material)
      }
    })

    // debugging type data
    this.calculate_mesh_metrics()
    console.log(`Vertex count:${this.vertex_count}    Triangle Count:${this.triangle_count}     Object Count:${this.objects_count} `)
  }

  public begin (): void {
    if (this.ui.dom_current_step_index !== null) {
      this.ui.dom_current_step_index.innerHTML = '1'
    }

    if (this.ui.dom_current_step_element !== null) {
      this.ui.dom_current_step_element.innerHTML = 'Load Model'
    }

    if (this.ui.dom_load_model_tools !== null) {
      this.ui.dom_load_model_tools.style.display = 'flex'
    }

    // if we are navigating back to this step, we don't want to add the event listeners again
    if (!this._added_event_listeners) {
      this.add_event_listeners()
      this._added_event_listeners = true
    }
  }

  public add_event_listeners (): void {
    if (this.ui.dom_upload_model_button !== null) {
      this.ui.dom_upload_model_button.addEventListener('change', (event: Event) => {
        const file = event.target.files[0]
        const file_extension: string = this.get_file_extension(file.name)

        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => {
          console.log('File reader loaded', reader)
          this.load_model_file(reader.result, file_extension)
        }
      })
    }

    if (this.ui.dom_load_model_debug_checkbox !== null) {
      this.ui.dom_load_model_debug_checkbox.addEventListener('change', (event: Event) => {
        const debug_mode = event.target.checked
        this.debug_model_loading = debug_mode
      })
    }

    if (this.ui.dom_load_model_button !== null) {
      this.ui.dom_load_model_button.addEventListener('click', () => {
        // get currently selected option out of the model-selection drop-down
        const model_selection = document.querySelector('#model-selection')

        if (model_selection !== null) {
          const file_name = model_selection.options[model_selection.selectedIndex].value
          const file_extension: string = this.get_file_extension(file_name)
          this.load_model_file(file_name, file_extension)
        }
      })
    }
  }

  private get_file_extension (file_path: string): string {
    const file_name: string | undefined = file_path.split('/').pop() // remove the directory path

    if (file_name === undefined) {
      console.error('Critical Error: Undefined file extension when loading model')
      return 'UNDEFINED'
    }

    const file_extension: string | undefined = file_name?.split('.').pop() // just get last part of the file name

    if (file_extension === undefined) {
      console.error('Critical Error: File does not have a "." symbol in the name')
      return 'UNDEFINED'
    }

    return file_extension
  }

  private load_model_file (model_file_path: string | ArrayBuffer | null, file_extension: string): void {
    if (file_extension === 'fbx') {
      console.log('Loading FBX model:', model_file_path)
      this.fbx_loader.load(model_file_path as string, (fbx) => {
        const loaded_scene: Scene = new Scene()
        loaded_scene.add(fbx)
        this.process_loaded_scene(loaded_scene)
      })
    } else if (file_extension === 'glb') {
      this.gltf_loader.load(model_file_path as string, (gltf) => {
        const loaded_scene: Scene = gltf.scene
        this.process_loaded_scene(loaded_scene)
      })
    } else if (file_extension === 'zip') {
      this.handle_zip_file(model_file_path)
    } else {
      console.error('Unsupported file format to load. Only acccepts FBX, (ZIP)GLTF+BIN, GLB:', model_file_path)
    }
  }

  /**
   * Handles loading a model from a ZIP file with GLTF data
   * supporting both data URLs and ArrayBuffer input.
   */
  private handle_zip_file (model_file_path: string | ArrayBuffer | null): void {
    // Handle loading a ZIP file with GLTF data inside it
    const handle_zip = (buffer: ArrayBuffer): void => {
      const zip_loader = new ZipGLTFLoader(this.gltf_loader)
      zip_loader.load_from_zip(buffer, (scene) => {
        this.process_loaded_scene(scene) // loaded successfully...continue
      }, (err: Error) => {
        console.error('Failed to load GLTF from ZIP:', err)
        new ModalDialog('Failed to load GLTF from ZIP: ', err?.message || err).show()
      }).catch((err: Error) => {
        console.error('Error loading ZIP:', err)
        new ModalDialog('Error loading ZIP: ', err?.message || err).show()
      })
    }

    // support both data URLs
    if (typeof model_file_path === 'string' && model_file_path.startsWith('data:')) {
      fetch(model_file_path)
        .then(async res => await res.arrayBuffer())
        .then(buffer => { handle_zip(buffer) })
        .catch((err: Error) => {
          console.error('Failed to fetch ZIP data:', err)
          new ModalDialog('Failed to fetch ZIP data: ', err?.message || err).show()
        })
    } else if (model_file_path instanceof ArrayBuffer) {
      handle_zip(model_file_path)
    } else {
      const msg = 'ZIP file data is not in a supported format'
      console.error(msg)
      new ModalDialog('ZIP file error decompressing: ', msg).show()
    }
  }

  private process_loaded_scene (loaded_scene: Scene): void {
    this.original_model_data = loaded_scene.clone()
    this.original_model_data.name = 'Cloned Scene'

    this.original_model_data.traverse((child) => {
      child.castShadow = true
    })

    // strip out stuff that we are not bringing into the model step
    const clean_scene_with_only_models = this.strip_out_all_unecessary_model_data(this.original_model_data)

    // Some objects come in very large, which makes it harder to work with
    // scale everything down to a max height
    this.scale_model_on_import_if_extreme(clean_scene_with_only_models)

    // loop through each child in scene and reset rotation
    // if we don't the skinning process doesn't take rotation into account
    // and creates odd results
    clean_scene_with_only_models.traverse((child) => {
      child.rotation.set(0, 0, 0)
    })

    console.log('Model loaded', clean_scene_with_only_models)

    // assign the final cleaned up model to the original model data
    this.final_mesh_data = clean_scene_with_only_models

    this.calculate_geometry_list()

    this.dispatchEvent(new CustomEvent('modelLoaded'))
  }

  private strip_out_all_unecessary_model_data (model_data: Scene): Scene {
    // create a new scene object, and only include meshes
    const new_scene = new Scene()
    new_scene.name = 'Imported Model'

    model_data.traverse((child) => {
      let new_mesh: Mesh

      // if the schild is a skinned mesh, create a new mesh object and apply the geometry and material
      if (child.type === 'SkinnedMesh') {
        new_mesh = new Mesh((child as SkinnedMesh).geometry, (child as SkinnedMesh).material)
        new_mesh.name = child.name
        new_scene.add(new_mesh)
      } else if (child.type === 'Mesh') {
        new_mesh = (child as Mesh).clone()
        new_mesh.name = child.name
        new_scene.add(new_mesh)
      }

      // potentially use normal material to help debugging models that look odd
      // some materials have some odd transparency or back-face things that make it look odd
      let material_to_use: MeshNormalMaterial
      if (this.debug_model_loading && new_mesh !== undefined) {
        material_to_use = new MeshNormalMaterial()
        material_to_use.side = FrontSide
        new_mesh.material = material_to_use
      }
    })

    return new_scene
  }

  private scale_model_on_import_if_extreme (scene_object: Scene): void {
    let scale_factor: number = 1.0

    // calculate all the meshes to find out the max height
    // some models are more wide like a bird, so don't just use height for this calculation
    const bounding_box = this.calculate_bounding_box(scene_object)
    const height = bounding_box.max.y - bounding_box.min.y
    const width = bounding_box.max.x - bounding_box.min.x
    const depth = bounding_box.max.z - bounding_box.min.z

    const largest_dimension = Math.max(height, width, depth)

    // if model is very large, or very small, scale it to 1.5 to help with application
    if (largest_dimension > 0.5 && largest_dimension < 8) {
      console.log('Model a reasonable size, so no scaling applied: ', largest_dimension, ' units is largest dimension')
      return
    } else {
      console.log('Model is very large or small, so scaling applied: ', largest_dimension, ' units is largest dimension')
    }

    scale_factor = 1.5 / height // goal is to scale the model to 1.5 units height (similar to skeleton proportions)

    // scale all the meshes down by the calculated amount
    scene_object.traverse((child) => {
      if (child.type === 'Mesh') {
        (child as Mesh).geometry.scale(scale_factor, scale_factor, scale_factor)
      }
    })
  }

  private calculate_bounding_box (scene_object: Scene): Box3 {
    // calculate all the meshes to find out the max height
    let found_mesh: boolean = false
    let bounding_box: Box3 = new Box3()

    scene_object.traverse((child: Object3D) => {
      if (child.type === 'Mesh' && !found_mesh) {
        found_mesh = true
        bounding_box = new Box3().setFromObject(child.parent)
      }
    })

    return bounding_box
  }

  public model_meshes (): Scene {
    if (this.final_mesh_data !== undefined) {
      return this.final_mesh_data
    }

    // create a new scene object, and only include meshes
    const new_scene = new Scene()
    new_scene.name = 'Model data'

    // do a for loop to add all the meshes to the scene from the geometry and material list
    for (let i = 0; i < this.geometry_list.length; i++) {
      const mesh = new Mesh(this.geometry_list[i], this.material_list[i])
      new_scene.add(mesh)
    }

    this.final_mesh_data = new_scene

    return this.final_mesh_data
  }

  public models_geometry_list (): BufferGeometry[] {
    // loop through final mesh data and return the geometeries
    const geometries_to_return: BufferGeometry[] = []
    this.final_mesh_data.traverse((child) => {
      if (child.type === 'Mesh') {
        geometries_to_return.push((child as Mesh).geometry.clone())
      }
    })

    return geometries_to_return
  }

  public models_material_list (): Material[] {
    return this.material_list
  }

  /**
   * Rotate all geometry data in the model by the given angle (in degrees) around the specified axis.
   * This directly modifies the geometry vertices.
   */
  public rotate_model_geometry (axis: 'x' | 'y' | 'z', angle: number): void {
    const radians = MathUtils.degToRad(angle)
    this.final_mesh_data.traverse((obj: Object3D) => {
      if (obj.type === 'Mesh') {
        const mesh = obj as Mesh
        mesh.geometry.rotateX(axis === 'x' ? radians : 0)
        mesh.geometry.rotateY(axis === 'y' ? radians : 0)
        mesh.geometry.rotateZ(axis === 'z' ? radians : 0)
        mesh.geometry.computeBoundingBox()
        mesh.geometry.computeBoundingSphere()
      }
    })
  }

  public move_model_to_floor (): void {
    // go through all the meshes and find out the lowest point
    // to use later. A model could contain multiple meshes
    // and we want to make sure the offset is the same between all of them
    let final_lowest_point: number = 0
    this.final_mesh_data.traverse((obj: Object3D) => {
      // if object is a mesh, rotate the geometry data
      if (obj.type === 'Mesh') {
        const mesh_obj: Mesh = obj as Mesh
        const bounding_box = new Box3().setFromObject(mesh_obj)

        if (bounding_box.min.y < final_lowest_point) {
          final_lowest_point = bounding_box.min.y
        }
      }
    })

    // move all the meshes to the floor by the amount we calculated above
    this.final_mesh_data.traverse((obj: Object3D) => {
      // if object is a mesh, rotate the geometry data
      if (obj.type === 'Mesh') {
        const mesh_obj: Mesh = obj as Mesh

        // this actually updates the geometry, so the origin will still be at 0,0,0
        // maybe need to recompute the bounding box and sphere internally after translate
        const offset = final_lowest_point * -1
        mesh_obj.geometry.translate(0, offset, 0)
        mesh_obj.geometry.computeBoundingBox()
        mesh_obj.geometry.computeBoundingSphere()
      }
    })
  }
}
