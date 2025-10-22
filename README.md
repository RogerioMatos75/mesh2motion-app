<img src="./mesh2motion.svg" alt="Mesh2Motion Logo" width="400"/>

Import a 3D Model and automatically assign and export animations with Mesh2Motion. This is kind of similar to a web application like Mixamo, but I would like it to be more flexible so it can support other model and skeleton types. Hopefully the open source nature means it can be expanded on and evolve more than than the closed tools have. 

The marketing site that explains features and release notes: https://mesh2motion.org/

Try it live: https://app.mesh2motion.org/

![Screenshot](./readme.png)

## Usage
There are instructions built into the web application, but this is the general flow of how to use it:
1. Import a 3d model of your choosing (currently only supports GLB/GLTF format)
2. Pick what type of skeleton that the 3d model will use
3. Modify the skeleton to fit inside of the model (optionally test the results)
4. Test out various animations to see the results.
5. Select which animations you want to use, then export (currently only GLB/GLTF supported format)

## Building and running locally
The main dependency you need is Node.js. I am using 22.18.0, but other versions probably work fine too. Open you command line tool to the directory this readme is in. Run ths following commands to start the web server.

    npm install
    npm run dev

## Creating a production build for the web
We mostly just have typescript for this project, which web browsers cannot just read, so we need to do a build step to get everything ready for deploying. This project uses Vite for the web server and builder. See the vite.config.js for more info. This command will create a "dist" folder with all the files to serve to the web:

    npm run build

## Running in Docker
If you don't want to modify your local file system, you can alternitvely build and run the project from Docker. Make sure you have Docker and Docker Compose installed. Navigate your command line tool to this directory where your Dockerfile is at. Make sure Docker is actually started and running before you run this command.

Execute the following command.

    docker-compose up -d

To try it out, visit http://localhost:3000

## Running and creating video previews
There is separate tool in the web app where you can generate video previews for each animation. It isn't too hard to run, but it has a separate README file that explains how that works. It is more of an internal tool, so I didn't want to muddy up this page too much.

[Preview Generator Documentation](src/preview-generator/README.md)

## Contributor Guide
I am not an animator, so you will notice a lot of animations aren't very good. It is a good assumption that if the animation sucks, it is probably made by me. Feel free to help me and create better/new ones.

[Contributor Guide](CONTRIBUTOR.md)

## Contribute to the animation fund
I don't expect to be receiving money for working on this, but I am also not the best animator. If people want to see better, and more, animations made, add to the fund. I can pay for an animator to help build out the animation library better. Or, if you know an animator that wants to help with this, send them my way! I am just a dude working on this during nights and weekends.

<img src="./venmo.png" alt="Venmo Animator Fund" width="400"/>

## O Que Você Pode Criar

o pré-requisito essencial é ter um modelo 3D com um esqueleto (skeleton/rig/armature) já definido e nomeado corretamente.
Vamos detalhar esse fluxo que você imaginou, porque ele é brilhante:

1. O Ponto de Partida: O Modelo "T-Pose"
O Que é? Você começa com um arquivo .glb que contém um modelo em uma pose neutra, geralmente a "T-Pose" (braços esticados para os lados).
O Esqueleto Interno: O mais importante é que, dentro desse modelo, existe uma hierarquia de "ossos" digitais. Pense nisso como uma marionete. Cada osso tem um nome único (ex: upper_arm_L, head, spine_01).
"Skinning": O modelo 3D (a "pele" ou "malha") está associado a esses ossos. Quando um osso se move, ele deforma a parte da malha que está conectada a ele.
Isso é exatamente o que você descreveu. Tendo esse modelo "pronto para animar", o resto do processo se torna possível.

2. A "Receita" do Movimento: O JSON
Aqui entra a sua intuição sobre o Blender e o Python. O princípio é o mesmo. Em vez de um script Python, a IA geraria um arquivo de instruções, que poderia ser um JSON.
Esse JSON não conteria o modelo, mas sim a "receita" do movimento. Ele seria uma lista de comandos para os ossos do esqueleto ao longo do tempo. Um exemplo simplificado para fazer um personagem acenar seria:
code
JSON
{
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
    // ...poderia haver outras "tracks" para outros ossos...
  ]
}






