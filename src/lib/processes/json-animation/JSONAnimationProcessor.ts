import * as THREE from 'three';

/**
 * @description Processes a JSON object to create and apply a THREE.AnimationClip.
 */
export class JSONAnimationProcessor {

  constructor() {}

  public run(targetSkeleton: THREE.Skeleton): THREE.AnimationClip {
    console.log("JSONAnimationProcessor running...");

    // Hardcoded JSON animation data for testing (from README.md)
    const animationData = {
      "animationName": "Wave_Hand",
      "duration": 2.0, // A animação dura 2 segundos
      "tracks": [
        {
          "boneName": "right_forearm", // O alvo é o osso do antebraço direito
          "property": "rotation",     // Vamos animar a rotação
          "keyframes": [
            // [tempo_em_segundos, valor_rotacao_x, valor_rotacao_y, valor_rotacao_z]
            [0.0, 0, 0, 0],       // Posição inicial
            [0.5, 0, 0, -45],     // Gira para um lado
            [1.0, 0, 0, 45],      // Gira para o outro lado
            [1.5, 0, 0, -45],     // Repete
            [2.0, 0, 0, 0]        // Volta à posição inicial
          ]
        }
      ]
    };

    console.log("Animation Data:", animationData);
    console.log("Target Skeleton:", targetSkeleton);

    // TODO:
    // 1. Find the target bone ("right_forearm") in the targetSkeleton.
    // 2. Create an array of times and an array of quaternion values from keyframes.
    //    - The rotation values in the JSON are likely Euler angles in degrees and need to be converted to radians and then to quaternions.
    // 3. Create a THREE.QuaternionKeyframeTrack.
    // 4. Create a THREE.AnimationClip from the track.
    // 5. Return the AnimationClip.

    // Placeholder return
    const emptyClip = new THREE.AnimationClip('empty', 0, []);
    return emptyClip;
  }
}
