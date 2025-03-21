import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Float32BufferAttribute } from 'three';
// import { Line2, LineGeometry, LineMaterial } from 'three-fatline';

const Simulator = () => {

    const atmosphereVertex =
    `
    varying vec3 vertexNormal;
    void main() {
        vertexNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
    `;

    const atmosphereFragment =
    `
    uniform float intensityFactor;
    varying vec3 vertexNormal;
    void main() {
        float intensity = pow(intensityFactor - dot(vertexNormal, vec3(0, 0, 1.0)), 2.0);
        gl_FragColor = vec4(1.0, 0.25, 0.0, 1.0) * intensity;
    }
    `;

    const canvasRef = useRef(null);
    const cameraRef = useRef(null);
    const meshesRef = useRef([]);
    const meshesRingRef = useRef([]);
    const meshesOrbitLineRef = useRef([]);
    const hoveredObjectRef = useRef(null);
    const [hoverNow, setHoverNow] = useState(null);
    const [linkTo, setlinkTo] = useState(null);
    const orbitSpeedRef = useRef(null);

    // Opacity value
    // Orbit
    const opacityDefault_orbitLine = 0.2;
    const opacityHover_orbitLine = 0.7;
    // Planet
    const opacityDefault = 0.7;
    const opacityHover = 1;

    useEffect(() => {
        const canvas = canvasRef.current;
        const textureLoader = new THREE.TextureLoader();

        // Create the scene
        const scene = new THREE.Scene();

        // Renderer
        const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.position.setZ(180);
        camera.position.setY(30);

        // Light
        const ambientLight = new THREE.AmbientLight(0x333333);
        scene.add(ambientLight);
        const pointLight = new THREE.PointLight(0xffffff, 2, 1200)
        scene.add(pointLight);

        // Background
        scene.background = textureLoader.load('/assets/3d_page/texture/blackbg.jpg')

        // Galaxy
        const galaxyGeometry = new THREE.SphereGeometry(400, 32, 32);
        const galaxyMaterial = new THREE.MeshBasicMaterial({
            side: THREE.BackSide,
            map: textureLoader.load('/assets/3d_page/texture/background.jpg')
        });
        const galaxy = new THREE.Mesh(galaxyGeometry, galaxyMaterial);
        scene.add(galaxy);

        // Orbit controls
        const controls = new OrbitControls(camera, renderer.domElement);

        // Sun orbit (3D Object Parent)
        const sunOrbit = new THREE.Object3D();
        scene.add(sunOrbit);

        // Array for store mesh object
        const meshes_planet = [];
        const meshes_ring = [];
        const meshes_orbitLine = [];

        // Sun mesh
        const sun = new THREE.Mesh(
            new THREE.SphereGeometry(16, 32, 32),
            new THREE.MeshBasicMaterial({
                map: textureLoader.load('/assets/3d_page/texture/sun.jpg'),
                transparent: true,
                opacity: opacityDefault
            })
        );
        sunOrbit.add(sun); // add sun to parent object
        sun.name = "Sun";
        sun.navigatePath = "sun";
        // meshes_planet.push(sun);

        // Sun shader
        sun.shader_intensity = 0.4;
        const sunShader = new THREE.Mesh(
            new THREE.SphereGeometry(16, 32, 32),
            new THREE.ShaderMaterial({
                vertexShader: atmosphereVertex,
                fragmentShader: atmosphereFragment,
                uniforms: {
                    intensityFactor: { value: sun.shader_intensity }
                },
                blending: THREE.AdditiveBlending,
                side: THREE.BackSide,
                visible: true
            })
        );
        sunShader.scale.set(1.2, 1.2, 1.2)
        sun.add(sunShader);
        meshes_planet.push(sun);

        const createPlanet = function (name, navigatePath, radius, ellipseY, rotateSpeed, orbitSpeed, texture, colors, ring) {
            const ellipseX = ellipseY * 1.7;
            orbitSpeedRef.current = 1;
            // Create mesh
            const mesh = new THREE.Mesh(
                new THREE.SphereGeometry(radius, 32, 32),
                new THREE.MeshStandardMaterial({
                    map: textureLoader.load(texture),
                    transparent: true,
                    opacity: opacityDefault
                })
            );
            sunOrbit.add(mesh);

            // Create ring
            if (ring) {
                const ringMesh = new THREE.Mesh(
                    new THREE.RingGeometry(ring.innerRadius,
                        ring.outerRadius,
                        32),
                    new THREE.MeshBasicMaterial({
                        map: textureLoader.load(ring.texture),
                        side: THREE.DoubleSide,
                        transparent: true,
                        opacity: opacityDefault
                    })
                )
                // ringMesh.position.setX(ellipseY);
                ringMesh.rotation.x = -0.5 * Math.PI
                sunOrbit.add(ringMesh);
                mesh.add(ringMesh);
                ringMesh.name = name;

                meshes_ring.push(ringMesh);
            }
            mesh.name = name;
            mesh.navigatePath = navigatePath;

            // Create orbit-line
            let orbitAngle = Math.floor(Math.random() * 1000);
            let orbitPoint = [];
            const orbitMaterial = new THREE.LineBasicMaterial({
                color: colors,
                linewidth: 10,
                transparent: true,
                opacity: opacityDefault_orbitLine
            });
            for (let i = 0; i <= 100; i++) {
                const Angle = (i / 100) * Math.PI * 2;
                const X = ellipseX * Math.cos(Angle);
                const Y = 0;
                const Z = ellipseY * Math.sin(Angle);
                orbitPoint.push(new THREE.Vector3(X, Y, Z));
            }
            const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoint);
            const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
            orbitLine.name = name;
            meshes_orbitLine.push(orbitLine);

            meshes_planet.push(mesh);
            sunOrbit.add(orbitLine);

            return { name, mesh, rotateSpeed, orbitAngle, orbitSpeed, ellipseX, ellipseY, orbitLine };
        }

        const mercury = createPlanet('Mercury', 'mercury', 3.2, 28, 0.004, 0.04, '/assets/3d_page/texture/mercury.jpg', 0xffffff);
        const venus = createPlanet('Venus', 'venus', 5.8, 44, 0.002, 0.015, '/assets/3d_page/texture/venus.jpg', 0xffffff);
        const earth = createPlanet('Earth', 'earth', 6, 62, 0.02, 0.01, '/assets/3d_page/texture/earth.jpg', 0xffffff);
        const mars = createPlanet('Mars', 'mars', 4, 78, 0.018, 0.008, '/assets/3d_page/texture/mars.jpg', 0xffffff);
        const jupiter = createPlanet('Jupiter', 'jupiter', 12, 100, 0.04, 0.002, '/assets/3d_page/texture/jupiter.jpg', 0xffffff);
        const saturn = createPlanet('Saturn', 'saturn', 10, 138, 0.038, 0.0009, '/assets/3d_page/texture/saturn.jpg', 0xffffff, {
            innerRadius: 10,
            outerRadius: 20,
            texture: '/assets/3d_page/texture/saturn ring.png'
        });
        const uranus = createPlanet('Uranus', 'uranus', 7, 176, 0.03, 0.0004, '/assets/3d_page/texture/uranus.jpg', 0xffffff, {
            innerRadius: 7,
            outerRadius: 12,
            texture: '/assets/3d_page/texture/uranus ring.png'
        });
        const neptune = createPlanet('Neptune', 'neptune', 7, 200, 0.032, 0.0001, '/assets/3d_page/texture/neptune.jpg', 0xffffff);

        const render = function () {

            // Self-rotation
            sun.rotateY(-0.004);
            mercury.mesh.rotateY(mercury.rotateSpeed * orbitSpeedRef.current);
            venus.mesh.rotateY(venus.rotateSpeed * orbitSpeedRef.current);
            earth.mesh.rotateY(earth.rotateSpeed * orbitSpeedRef.current);
            mars.mesh.rotateY(mars.rotateSpeed * orbitSpeedRef.current);
            jupiter.mesh.rotateY(jupiter.rotateSpeed * orbitSpeedRef.current);
            saturn.mesh.rotateY(saturn.rotateSpeed * orbitSpeedRef.current);
            uranus.mesh.rotateY(uranus.rotateSpeed * orbitSpeedRef.current);
            neptune.mesh.rotateY(neptune.rotateSpeed * orbitSpeedRef.current);

            // Around-sun-rotation
            mercury.orbitAngle += mercury.orbitSpeed * orbitSpeedRef.current;
            mercury.mesh.position.set(mercury.ellipseX * Math.cos(mercury.orbitAngle), 0, mercury.ellipseY * Math.sin(mercury.orbitAngle));

            venus.orbitAngle += venus.orbitSpeed * orbitSpeedRef.current;
            venus.mesh.position.set(venus.ellipseX * Math.cos(venus.orbitAngle), 0, venus.ellipseY * Math.sin(venus.orbitAngle));

            earth.orbitAngle += earth.orbitSpeed * orbitSpeedRef.current;
            earth.mesh.position.set(earth.ellipseX * Math.cos(earth.orbitAngle), 0, earth.ellipseY * Math.sin(earth.orbitAngle));

            mars.orbitAngle += mars.orbitSpeed * orbitSpeedRef.current;
            mars.mesh.position.set(mars.ellipseX * Math.cos(mars.orbitAngle), 0, mars.ellipseY * Math.sin(mars.orbitAngle));

            jupiter.orbitAngle += jupiter.orbitSpeed * orbitSpeedRef.current;
            jupiter.mesh.position.set(jupiter.ellipseX * Math.cos(jupiter.orbitAngle), 0, jupiter.ellipseY * Math.sin(jupiter.orbitAngle));

            saturn.orbitAngle += saturn.orbitSpeed * orbitSpeedRef.current;
            saturn.mesh.position.set(saturn.ellipseX * Math.cos(saturn.orbitAngle), 0, saturn.ellipseY * Math.sin(saturn.orbitAngle));

            uranus.orbitAngle += uranus.orbitSpeed * orbitSpeedRef.current;
            uranus.mesh.position.set(uranus.ellipseX * Math.cos(uranus.orbitAngle), 0, uranus.ellipseY * Math.sin(uranus.orbitAngle));

            neptune.orbitAngle += neptune.orbitSpeed * orbitSpeedRef.current;
            neptune.mesh.position.set(neptune.ellipseX * Math.cos(neptune.orbitAngle), 0, neptune.ellipseY * Math.sin(neptune.orbitAngle));

            cameraRef.current = camera;
            meshesRef.current = meshes_planet;
            meshesOrbitLineRef.current = meshes_orbitLine;
            meshesRingRef.current = meshes_ring;

            renderer.render(scene, camera);
        }

        // Animate function (Loop)
        const animate = function () {
            requestAnimationFrame(animate);
            render();
        };
        animate();

        // Clean up the scene when the component is unmounted
        return () => {
            renderer.dispose();
            for (let i = 0; i < meshesRef.current.length; i++) {
                const mesh = meshesRef.current[i];
                mesh.geometry.dispose();
                mesh.material.dispose();
            }
            for (let i = 0; i < meshesRingRef.current.length; i++) {
                const meshRing = meshesRingRef.current[i];
                meshRing.geometry.dispose();
                meshRing.material.dispose();
            }
            for (let i = 0; i < meshesOrbitLineRef.current.length; i++) {
                const meshesOrbitLine = meshesOrbitLineRef.current[i];
                meshesOrbitLine.geometry.dispose();
                meshesOrbitLine.material.dispose();
            }
        };
    }, []);

    const navigate = useNavigate();

    const [hoverIndex,setHoverIndex] = useState(-1);

    function handleMouseMove(event) {
        // Get the mouse position relative to the canvas element
        const rect = canvasRef.current.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Calculate the normalized device coordinates (NDC) from the mouse position
        const mouse = new THREE.Vector2();
        mouse.x = (x / canvasRef.current.clientWidth) * 2 - 1;
        mouse.y = -(y / canvasRef.current.clientHeight) * 2 + 1;

        // Create a raycaster object and set its origin and direction based on the mouse position
        const raycaster = new THREE.Raycaster();
        if (cameraRef.current) {
            raycaster.setFromCamera(mouse, cameraRef.current);
        }

        // Find all the intersections between the raycaster and the meshes
        const intersects = raycaster.intersectObjects(meshesRef.current);

        if (intersects.length > 0) {
            // Get the intersected object
            const intersectedObject = intersects[0].object;

            // Set hover name and hoverObject
            setHoverNow(intersectedObject.name);
            setlinkTo(intersectedObject.navigatePath);
            hoveredObjectRef.current = intersectedObject;

            
            // Test Change Shader
            if(hoveredObjectRef.current.children[0] !== null && hoveredObjectRef.current.children[0] !== undefined){
                // console.log(hoveredObjectRef.current.children[0]);
                // console.log("Intensity Value = " + hoveredObjectRef.current.children[0].material.uniforms.intensityFactor.value);
                // hoveredObjectRef.current.children[0].material.visible = false;
            }

            // Set the opacity of the previously hovered object back to its default value
            if (hoveredObjectRef.current && hoveredObjectRef.current !== intersectedObject) {
                hoveredObjectRef.current.material.opacity = opacityDefault;
                hoveredObjectRef.current.material.needsUpdate = true;
            }

            // Planet
            intersectedObject.material.opacity = opacityHover;
            intersectedObject.material.needsUpdate = true;

            // Planet Ring
            for (const child of intersects[0].object.children) {
                child.material.opacity = opacityHover;
                child.material.needsUpdate = true;
                intersectedObject.material.opacity = opacityHover;
                intersectedObject.material.needsUpdate = true;
            }

            // Orbit line 
            for (const orbitLine of meshesOrbitLineRef.current) {
                if (orbitLine.name === intersectedObject.name) {
                    orbitLine.material.opacity = opacityHover_orbitLine;
                    orbitLine.material.needsUpdate = true;
                }
            }

        }
        else {
            // Set the opacity of the previously hovered object back to its default value
            if (hoveredObjectRef.current) {
                hoveredObjectRef.current.material.opacity = opacityDefault;
                hoveredObjectRef.current.material.needsUpdate = true;
                hoveredObjectRef.current = null;

                // Planet Ring
                for (const mesh of meshesRef.current) {
                    mesh.children.forEach((child) => {
                        child.material.opacity = opacityDefault;
                        child.material.needsUpdate = true;
                    });
                }

                // Orbit line 
                for (const orbitLine of meshesOrbitLineRef.current) {
                    if (orbitLine.material.opacity === opacityHover_orbitLine) {
                        orbitLine.material.opacity = opacityDefault_orbitLine;
                        orbitLine.material.needsUpdate = true;
                    }
                }
            }

            setHoverNow(null);
            setlinkTo(null);
            return;
        }
    }

    const handleMouseClick = function (event) {
        // Get the mouse position relative to the canvas element
        const rect = canvasRef.current.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Calculate the normalized device coordinates (NDC) from the mouse position
        const mouse = new THREE.Vector2();
        mouse.x = (x / canvasRef.current.clientWidth) * 2 - 1;
        mouse.y = -(y / canvasRef.current.clientHeight) * 2 + 1;

        // Create a raycaster object and set its origin and direction based on the mouse position
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, cameraRef.current);

        // Find all the intersections between the raycaster and the meshes
        const intersects = raycaster.intersectObjects(meshesRef.current);

        if (intersects.length > 0 && linkTo) {
            const intersectedObject = intersects[0].object;
            setlinkTo(intersectedObject.navigatePath);
            navigate(`/simulate/${linkTo}`)
        }
        else {
            setlinkTo(null);
        }
    }
    const [planetData,setPlanetData] = useState([
        {
            id: "sun",
            name: "Sun",
            name_th: "ดวงอาทิตย์",
            imageUrl:
              "https://www.freeiconspng.com/thumbs/sun/picture-of-real-sun-the-color-of-fire-red-21.png",
          },
          {
            id: "mercury",
            name: "Mercury",
            name_th: "ดาวพุธ",
            imageUrl: "/assets/puzzle_game_page/PlanetSort/mercury.jpeg",
          },
          {
            id: "venus",
            name: "Venus",
            name_th: "ดาวศุกร์",
            imageUrl: "/assets/puzzle_game_page/PlanetSort/venus.png",
          },
          {
            id: "earth",
            name: "Earth",
            name_th: "ดาวโลก",
            imageUrl: "/assets/puzzle_game_page/PlanetSort/earth.png",
          },
          {
            id: "mars",
            name: "Mars",
            name_th: "ดาวอังคาร",
            imageUrl: "/assets/puzzle_game_page/PlanetSort/mars.png",
          },
          {
            id: "jupiter",
            name: "Jupiter",
            name_th: "ดาวพฤหัส",
            imageUrl: "/assets/puzzle_game_page/PlanetSort/jupiter.png",
          },
          {
            id: "saturn",
            name: "Saturn",
            name_th: "ดาวเสาร์",
            imageUrl: "/assets/puzzle_game_page/PlanetSort/saturn.png",
          },
          {
            id: "uranus",
            name: "Uranus",
            name_th: "ดาวยูเรนัส",
            imageUrl: "/assets/puzzle_game_page/PlanetSort/uranus.png",
          },{
            id:"neptune",
            name:"Neptune",
            name_th:"ดาวเนปจูน",
            imageUrl: "/assets/puzzle_game_page/PlanetSort/neptune.png"
        }
    ]
    )

    const rangeValues = [0.25, 0.5, 1, 1.5, 3];
    const slowerRangeValues = [0.1,0.2,0.5,0.75, 1, 1.5, 2, 3];
    const handleRangeChange = (event) => {
        const step = event.target.value;
        orbitSpeedRef.current = slowerRangeValues[step]; // Update the value using useRef
    };
    useEffect(()=>{
        orbitSpeedRef.current = 0.1;
    },[])
    const planets = [
        { name: 'Mercury', orbitalPeriod: 88 },
        { name: 'Venus', orbitalPeriod: 225 },
        { name: 'Earth', orbitalPeriod: 365 },
        { name: 'Mars', orbitalPeriod: 687 },
        { name: 'Jupiter', orbitalPeriod: 4333 },
        { name: 'Saturn', orbitalPeriod: 10759 },
        { name: 'Uranus', orbitalPeriod: 30687 },
        { name: 'Neptune', orbitalPeriod: 60190 },
      ];
      
      
    return (
        <div className='relative flex justify-center overflow-hidden'>
            <div className="h-fit absolute left-0 mb-10 pt-2 pb-20 top-0">
               <div className="w-full h-full rounded-xl rounded-l-none py-4">
               {planetData.map((planet,index)=>(
                <div onClick={()=>{navigate("/simulate/"+planet.id)}}
                className={`px-2 2xl:px-4 py-1 2xl:py-2 font-ibm-thai border-b-2 bg-white bg-opacity-50 hover:bg-opacity-70 cursor-pointer
                ${index===planetData.length-1 && "border-none"} ${index===0 && "rounded-tr-xl"} ${index===planetData.length-1 && "rounded-br-xl"}`}>
                    <img src={planet.imageUrl} className="w-[2.25rem] 2xl:w-12 mx-auto"/>
                    <p className="text-center font-bold">{planet.name_th}</p>
                </div>
               ))}
               </div>
            </div>
            {/* <div className='absolute'>
    {planets.map((planet, i) => (
      <div key={planet.name}>
        <h1>{planet.name}</h1>
        <p>Current Day: {currentDays[i]}</p>
        <p>Orbital Period: {planet.orbitalPeriod} Earth days</p>
      </div>
    ))}
  </div> */}
            <canvas id="space" alt="space" ref={canvasRef} onMouseMove={handleMouseMove} onClick={handleMouseClick} />
            <p className="text-4xl font-ibm-thai font-bold text-white absolute top-auto mx-auto mt-14 tracking-wider">
                {hoverNow && planetData.find(p => p.name === hoverNow)?.name_th}
            </p>
            {hoverNow && <p className='absolute mt-24 font-ibm-thai text-white'>กดที่ดาวเพื่อดูข้อมูลเพิ่มเติม</p>}
            <div className='absolute w-full max-w-4xl top-5 flex h-fit text-white mx-auto font-ibm-thai cursor-pointer'>
                <p className='ml-auto text-xl'>ช้ามาก</p>
            <input type="range" className="w-3/4 h-4 appearance-none rounded-full bg-white outline-none mx-auto" min={0} max={slowerRangeValues.length - 1} step={1} 
                defaultValue={0.1} onChange={handleRangeChange}/>
                <p className='mr-auto text-xl'>เร็วมาก</p>
            </div>
        </div>
    )
};

export default Simulator;
