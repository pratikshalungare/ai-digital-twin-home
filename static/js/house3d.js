/**
 * AI DIGITAL TWIN HOME - 3D ONE-BHK ENGINE (THREE.JS)
 * Procedurally generates an interactive isometric 1-BHK smart home featuring:
 * - Smart Devices: Lights, Ceiling Fans, Refrigerator, Air Cooler, Water Pump, Exhaust Fan, Smart TV
 * - Dynamic Animations: Rotating fan blades, glowing lights, animated cooler mist, water tank levels
 * - Interactive Raycaster & Smooth Camera Interpolation
 */

class House3DEngine {
    constructor(containerId, onDeviceClicked) {
        this.container = document.getElementById(containerId);
        this.onDeviceClicked = onDeviceClicked || function() {};
        
        // 3D Core Objects
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Interactive Elements Registry
        this.lights = {};
        this.fans = {};
        this.coolers = {};
        this.pumps = {};
        this.appliances = {};
        this.waterTank = {};
        this.interactiveMeshes = [];
        
        // Camera Animation State
        this.cameraTargetPos = null;
        this.controlsTargetPos = null;
        
        // Dynamic States
        this.deviceStates = {
            living_light: 1,
            living_fan: 1,
            living_tv: 1,
            bedroom_light: 0,
            bedroom_fan: 0,
            bedroom_cooler: 1,
            kitchen_fridge: 1,
            kitchen_exhaust: 0,
            utility_pump: 0
        };
        this.waterLevel = 72.0;
        
        this.init();
    }

    init() {
        if (!this.container) return;

        // 1. SCENE
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x070d19);
        this.scene.fog = new THREE.FogExp2(0x070d19, 0.016);

        // 2. CAMERA
        const width = this.container.clientWidth || 800;
        const height = this.container.clientHeight || 500;
        this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
        this.camera.position.set(22, 24, 25);

        // 3. RENDERER
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // 4. ORBIT CONTROLS
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.06;
        this.controls.maxPolarAngle = Math.PI / 2.15;
        this.controls.minDistance = 8;
        this.controls.maxDistance = 55;
        this.controls.target.set(0, 0.5, 0);

        // 5. GLOBAL LIGHTING
        this.setupGlobalLighting();

        // 6. BUILD 1-BHK MODEL & GADGETS
        this.buildOneBHKStructure();

        // 7. EVENT LISTENERS
        window.addEventListener('resize', () => this.onWindowResize());
        this.renderer.domElement.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        this.renderer.domElement.addEventListener('pointermove', (e) => this.onPointerMove(e));

        // 8. RENDER LOOP
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    setupGlobalLighting() {
        const ambientLight = new THREE.AmbientLight(0x94a3b8, 0.75);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.65);
        dirLight.position.set(20, 30, 15);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 80;
        const d = 16;
        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;
        this.scene.add(dirLight);

        const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.35);
        this.scene.add(hemiLight);
    }

    // =========================================================================
    // 3D 1-BHK STRUCTURE
    // =========================================================================
    buildOneBHKStructure() {
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.1 });
        const livingFloorMat = new THREE.MeshStandardMaterial({ color: 0x273549, roughness: 0.3 });
        const bedFloorMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
        const tileFloorMat = new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.2 });
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });

        // Outer Floor Base Plate
        const basePlate = new THREE.Mesh(new THREE.BoxGeometry(22, 0.6, 17), floorMat);
        basePlate.position.set(0, -0.3, 0);
        basePlate.receiveShadow = true;
        this.scene.add(basePlate);

        // Room Floor Insets
        this.createRoomFloor(-5.2, 3.8, 10, 7.8, livingFloorMat);   // Living Room
        this.createRoomFloor(5.2, 3.8, 10, 7.8, bedFloorMat);       // Bedroom
        this.createRoomFloor(-5.2, -4.4, 10, 7.4, tileFloorMat);    // Kitchen
        this.createRoomFloor(0.2, -4.4, 4.4, 7.4, tileFloorMat);    // Bathroom
        this.createRoomFloor(5.7, -4.4, 6.6, 7.4, floorMat);        // Utility & Tank

        // Low Open-Top Isometric Walls
        const wallHeight = 1.6;
        const wallThick = 0.25;

        this.createWall(0, 8.0, 21.6, wallThick, wallHeight, wallMat);
        this.createWall(0, -8.3, 21.6, wallThick, wallHeight, wallMat);
        this.createWall(-10.6, 0, wallThick, 16.4, wallHeight, wallMat);
        this.createWall(10.6, 0, wallThick, 16.4, wallHeight, wallMat);

        this.createWall(0, 3.8, wallThick, 8.0, wallHeight, wallMat);
        this.createWall(-5.2, 0, 10.4, wallThick, wallHeight, wallMat);
        this.createWall(5.2, 0, 10.4, wallThick, wallHeight, wallMat);
        this.createWall(2.4, -4.4, wallThick, 7.4, wallHeight, wallMat);
        this.createWall(-2.2, -4.4, wallThick, 7.4, wallHeight, wallMat);

        // Build Rooms & Smart Gadgets
        this.buildLivingRoom();
        this.buildBedroom();
        this.buildKitchen();
        this.buildBathroom();
        this.buildUtilityAndWaterTank();

        // Floor Labels
        this.addRoomLabel(-5.2, 0.05, 0.5, "LIVING ROOM");
        this.addRoomLabel(5.2, 0.05, 0.5, "BEDROOM");
        this.addRoomLabel(-5.2, 0.05, -7.6, "KITCHEN");
        this.addRoomLabel(6.0, 0.05, -7.6, "UTILITY & PUMP");
    }

    createRoomFloor(x, z, w, d, material) {
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(x, 0.01, z);
        floor.receiveShadow = true;
        this.scene.add(floor);
    }

    createWall(x, z, width, depth, height, material) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
        wall.position.set(x, height / 2, z);
        wall.castShadow = true;
        wall.receiveShadow = true;
        this.scene.add(wall);
    }

    addRoomLabel(x, y, z, text) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = "transparent";
        ctx.fillRect(0, 0, 256, 64);
        ctx.font = "bold 26px Outfit, sans-serif";
        ctx.fillStyle = "#38bdf8";
        ctx.textAlign = "center";
        ctx.fillText(text, 128, 42);

        const texture = new THREE.CanvasTexture(canvas);
        const labelMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.75 });
        const labelMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.9), labelMat);
        labelMesh.rotation.x = -Math.PI / 2;
        labelMesh.position.set(x, y + 0.02, z);
        this.scene.add(labelMesh);
    }

    // =========================================================================
    // 1. LIVING ROOM (Light, Fan, Smart TV, Sofa)
    // =========================================================================
    buildLivingRoom() {
        const group = new THREE.Group();
        group.position.set(-5.5, 0, 4.0);

        // Sofa
        const sofaMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.6 });
        const cushionMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.5 });
        
        const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.45, 1.8), sofaMat);
        sofaBase.position.set(0, 0.25, 1.8);
        const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.0, 0.4), sofaMat);
        sofaBack.position.set(0, 0.8, 2.5);
        group.add(sofaBase, sofaBack);

        // Coffee table
        const table = new THREE.Mesh(
            new THREE.BoxGeometry(2.4, 0.35, 1.2),
            new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 })
        );
        table.position.set(0, 0.2, 0.0);
        group.add(table);

        // TV Stand
        const tvStand = new THREE.Mesh(
            new THREE.BoxGeometry(3.6, 0.5, 0.8),
            new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 })
        );
        tvStand.position.set(0, 0.25, -2.2);
        group.add(tvStand);

        // GADGET: SMART TV SCREEN (Interactive)
        const tvMat = new THREE.MeshStandardMaterial({ 
            color: 0x0f172a, 
            emissive: 0x0284c7, 
            emissiveIntensity: 0.4,
            roughness: 0.2 
        });
        const tvScreen = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.8, 0.1), tvMat);
        tvScreen.position.set(0, 1.4, -2.2);
        tvScreen.name = "living_tv";
        this.interactiveMeshes.push(tvScreen);
        group.add(tvScreen);

        this.appliances["living_tv"] = {
            mesh: tvScreen,
            mat: tvMat
        };

        this.scene.add(group);

        // Smart Light & Fan
        this.createCeilingLight("living_light", -5.5, 3.8, 4.0);
        this.createCeilingFan("living_fan", -5.5, 3.2, 4.0);
    }

    // =========================================================================
    // 2. BEDROOM (Light, Fan, Bed, Air Cooler)
    // =========================================================================
    buildBedroom() {
        const group = new THREE.Group();
        group.position.set(5.5, 0, 4.0);

        // Bed
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
        const mattressMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8 });
        const duvetMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.7 });

        const frame = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.4, 4.6), woodMat);
        frame.position.set(0, 0.2, 0.8);
        const headboard = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.8, 0.3), woodMat);
        headboard.position.set(0, 1.0, 3.0);
        const mattress = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.5, 4.2), mattressMat);
        mattress.position.set(0, 0.5, 0.8);
        const duvet = new THREE.Mesh(new THREE.BoxGeometry(3.45, 0.2, 3.0), duvetMat);
        duvet.position.set(0, 0.7, 0.2);
        group.add(frame, headboard, mattress, duvet);

        // GADGET: SMART BEDROOM AIR COOLER (Interactive & Mist Animated)
        this.createAirCooler(group, -3.2, 1.2);

        this.scene.add(group);

        this.createCeilingLight("bedroom_light", 5.5, 3.8, 4.0);
        this.createCeilingFan("bedroom_fan", 5.5, 3.2, 4.0);
    }

    createAirCooler(parentGroup, x, z) {
        const coolerGroup = new THREE.Group();
        coolerGroup.position.set(x, 0, z);

        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3 });
        const grillMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2 });

        // Cooler Cabinet
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 1.1), bodyMat);
        body.position.set(0, 0.9, 0);
        body.name = "bedroom_cooler";
        this.interactiveMeshes.push(body);
        coolerGroup.add(body);

        // Front Louver Grill
        const grill = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.8, 0.05), grillMat);
        grill.position.set(0, 1.2, 0.56);
        coolerGroup.add(grill);

        // Water level window
        const waterWindow = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.4, 0.05),
            new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
        );
        waterWindow.position.set(0.35, 0.4, 0.56);
        coolerGroup.add(waterWindow);

        // Animated Cool Mist Particles Group
        const mistGroup = new THREE.Group();
        mistGroup.position.set(0, 1.2, 0.8);
        
        for (let i = 0; i < 8; i++) {
            const mist = new THREE.Mesh(
                new THREE.SphereGeometry(0.12, 8, 8),
                new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.45 })
            );
            mist.position.set((Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.4, Math.random() * 0.8);
            mistGroup.add(mist);
        }
        coolerGroup.add(mistGroup);

        parentGroup.add(coolerGroup);

        this.coolers["bedroom_cooler"] = {
            group: coolerGroup,
            mistGroup: mistGroup,
            active: true
        };
    }

    // =========================================================================
    // 3. KITCHEN (Refrigerator, Exhaust Fan, Countertops)
    // =========================================================================
    buildKitchen() {
        const group = new THREE.Group();
        group.position.set(-5.5, 0, -4.5);

        // Countertop Unit
        const counter = new THREE.Mesh(
            new THREE.BoxGeometry(4.8, 1.1, 1.2),
            new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 })
        );
        counter.position.set(0, 0.55, -2.4);
        group.add(counter);

        // Refrigerator
        this.createRefrigerator(group, 2.0, -1.8);

        // GADGET: KITCHEN EXHAUST FAN (Wall mounted)
        this.createExhaustFan(group, -1.8, 2.2, -2.8);

        this.scene.add(group);
    }

    createRefrigerator(parentGroup, x, z) {
        const fridgeGroup = new THREE.Group();
        fridgeGroup.position.set(x, 0, z);

        const fridgeBodyMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.5, roughness: 0.3 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.6, 1.4), fridgeBodyMat);
        body.position.set(0, 1.3, 0);
        body.name = "kitchen_fridge";
        this.interactiveMeshes.push(body);
        fridgeGroup.add(body);

        const handle = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.6, 0.1),
            new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 })
        );
        handle.position.set(-0.6, 1.8, 0.72);
        fridgeGroup.add(handle);

        const ledMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x06b6d4, emissiveIntensity: 1.0 });
        const ledMesh = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), ledMat);
        ledMesh.position.set(0.5, 2.4, 0.72);
        fridgeGroup.add(ledMesh);

        parentGroup.add(fridgeGroup);

        this.appliances["kitchen_fridge"] = {
            mesh: body,
            ledMesh: ledMesh,
            ledMat: ledMat
        };
    }

    createExhaustFan(parentGroup, x, y, z) {
        const fanGroup = new THREE.Group();
        fanGroup.position.set(x, y, z);

        // Outer Ring Housing
        const housing = new THREE.Mesh(
            new THREE.TorusGeometry(0.45, 0.08, 12, 24),
            new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6 })
        );
        housing.name = "kitchen_exhaust";
        this.interactiveMeshes.push(housing);
        fanGroup.add(housing);

        // Spinning Exhaust Rotor Blades
        const rotor = new THREE.Group();
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI) / 2;
            const blade = new THREE.Mesh(
                new THREE.BoxGeometry(0.35, 0.02, 0.12),
                new THREE.MeshStandardMaterial({ color: 0x06b6d4 })
            );
            blade.position.set(Math.cos(angle) * 0.2, Math.sin(angle) * 0.2, 0);
            blade.rotation.z = angle;
            rotor.add(blade);
        }
        fanGroup.add(rotor);

        parentGroup.add(fanGroup);

        this.fans["kitchen_exhaust"] = {
            group: fanGroup,
            rotor: rotor,
            currentSpeed: 0,
            targetSpeed: 0
        };
    }

    // =========================================================================
    // 4. BATHROOM
    // =========================================================================
    buildBathroom() {
        const group = new THREE.Group();
        group.position.set(0.2, 0, -4.5);

        const glassScreen = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 2.4, 2.4),
            new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35, roughness: 0.1 })
        );
        glassScreen.position.set(-1.4, 1.2, -1.8);

        const vanity = new THREE.Mesh(
            new THREE.BoxGeometry(1.4, 1.0, 1.0),
            new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 })
        );
        vanity.position.set(1.0, 0.5, -2.4);

        group.add(glassScreen, vanity);
        this.scene.add(group);
    }

    // =========================================================================
    // 5. UTILITY AREA, WATER TANK & SMART PUMP
    // =========================================================================
    buildUtilityAndWaterTank() {
        const group = new THREE.Group();
        group.position.set(6.0, 0, -4.5);

        // Stand Platform
        const standMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6, roughness: 0.4 });
        const platform = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.4, 3.6), standMat);
        platform.position.set(0, 0.4, 0);
        group.add(platform);

        // Water Tank Cylinder
        const tankRadius = 1.4;
        const tankMaxHeight = 2.8;

        const outerGlassMat = new THREE.MeshStandardMaterial({
            color: 0x94a3b8,
            transparent: true,
            opacity: 0.28,
            roughness: 0.1
        });
        const outerTank = new THREE.Mesh(
            new THREE.CylinderGeometry(tankRadius, tankRadius, tankMaxHeight, 32, 1, true),
            outerGlassMat
        );
        outerTank.position.set(0, 0.6 + tankMaxHeight / 2, 0);
        outerTank.name = "water_tank";
        this.interactiveMeshes.push(outerTank);
        group.add(outerTank);

        // Inner Water Mesh
        const waterRadius = tankRadius - 0.06;
        const waterMat = new THREE.MeshStandardMaterial({
            color: 0x0284c7,
            emissive: 0x0284c7,
            emissiveIntensity: 0.35,
            transparent: true,
            opacity: 0.78
        });
        const waterMesh = new THREE.Mesh(new THREE.CylinderGeometry(waterRadius, waterRadius, 1.0, 32), waterMat);
        waterMesh.position.set(0, 0.6 + 0.5, 0);
        group.add(waterMesh);

        // 3D Warning Beacon
        const beacon = new THREE.Mesh(
            new THREE.SphereGeometry(0.35, 12, 12),
            new THREE.MeshBasicMaterial({ color: 0xef4444, wireframe: true })
        );
        beacon.position.set(0, 0.6 + tankMaxHeight + 0.8, 0);
        beacon.visible = false;
        group.add(beacon);

        // GADGET: SMART WATER PUMP & INLET PIPE
        this.createSmartPump(group, -1.8, 0.35, 0.8);

        this.scene.add(group);

        this.waterTank = {
            group: group,
            waterMesh: waterMesh,
            waterMat: waterMat,
            beacon: beacon,
            maxHeight: tankMaxHeight,
            baseY: 0.6
        };

        this.updateWaterMesh(this.waterLevel);
    }

    createSmartPump(parentGroup, x, y, z) {
        const pumpGroup = new THREE.Group();
        pumpGroup.position.set(x, y, z);

        const motorMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, metalness: 0.7, roughness: 0.3 });
        const pipeMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8 });

        // Electric Motor Cylinder
        const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.8, 24), motorMat);
        motor.rotation.z = Math.PI / 2;
        motor.name = "utility_pump";
        this.interactiveMeshes.push(motor);
        pumpGroup.add(motor);

        // Inlet Pipe to Tank
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.6, 16), pipeMat);
        pipe.rotation.z = Math.PI / 2;
        pipe.position.set(0.9, 0.1, 0);
        pumpGroup.add(pipe);

        // LED Indicator
        const ledMat = new THREE.MeshBasicMaterial({ color: 0x475569 });
        const led = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), ledMat);
        led.position.set(0, 0.45, 0);
        pumpGroup.add(led);

        parentGroup.add(pumpGroup);

        this.pumps["utility_pump"] = {
            group: pumpGroup,
            motor: motor,
            led: led,
            ledMat: ledMat,
            active: false
        };
    }

    // =========================================================================
    // LIGHTS & FANS FACTORIES
    // =========================================================================
    createCeilingLight(deviceId, x, y, z) {
        const lightGroup = new THREE.Group();
        lightGroup.position.set(x, y, z);

        const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
        cord.position.set(0, -0.4, 0);
        lightGroup.add(cord);

        const bulbMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfde047, emissiveIntensity: 1.0 });
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), bulbMat);
        bulb.position.set(0, -0.85, 0);
        bulb.name = deviceId;
        this.interactiveMeshes.push(bulb);
        lightGroup.add(bulb);

        const pointLight = new THREE.PointLight(0xfef08a, 1.2, 12, 1.5);
        pointLight.position.set(0, -0.9, 0);
        lightGroup.add(pointLight);

        this.scene.add(lightGroup);

        this.lights[deviceId] = {
            group: lightGroup,
            bulb: bulb,
            bulbMat: bulbMat,
            pointLight: pointLight
        };

        this.setLightState(deviceId, this.deviceStates[deviceId] || 0);
    }

    createCeilingFan(deviceId, x, y, z) {
        const fanGroup = new THREE.Group();
        fanGroup.position.set(x, y, z);

        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
        rod.position.set(0, -0.4, 0);
        fanGroup.add(rod);

        const rotor = new THREE.Group();
        rotor.position.set(0, -0.8, 0);

        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.14, 24), new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.4 }));
        hub.name = deviceId;
        this.interactiveMeshes.push(hub);
        rotor.add(hub);

        const bladeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
        for (let i = 0; i < 3; i++) {
            const angle = (i * 2 * Math.PI) / 3;
            const blade = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.03, 0.32), bladeMat);
            blade.position.set(Math.cos(angle) * 0.95, 0, Math.sin(angle) * 0.95);
            blade.rotation.y = -angle;
            blade.rotation.z = 0.1;
            rotor.add(blade);
        }

        fanGroup.add(rotor);
        this.scene.add(fanGroup);

        this.fans[deviceId] = {
            group: fanGroup,
            rotor: rotor,
            currentSpeed: 0,
            targetSpeed: 0
        };

        this.setFanState(deviceId, this.deviceStates[deviceId] || 0);
    }

    // =========================================================================
    // STATE UPDATERS
    // =========================================================================
    setDeviceState(deviceId, state) {
        this.deviceStates[deviceId] = state;

        if (this.lights[deviceId]) {
            this.setLightState(deviceId, state);
        } else if (this.fans[deviceId]) {
            this.setFanState(deviceId, state);
        } else if (this.coolers[deviceId]) {
            this.coolers[deviceId].active = (state === 1);
            if (this.coolers[deviceId].mistGroup) {
                this.coolers[deviceId].mistGroup.visible = (state === 1);
            }
        } else if (this.pumps[deviceId]) {
            const p = this.pumps[deviceId];
            p.active = (state === 1);
            p.ledMat.color.setHex(state === 1 ? 0x10b981 : 0x475569);
        } else if (this.appliances[deviceId]) {
            this.setApplianceState(deviceId, state);
        }
    }

    setLightState(deviceId, state) {
        const item = this.lights[deviceId];
        if (!item) return;
        if (state === 1) {
            item.pointLight.intensity = 1.3;
            item.bulbMat.emissive.setHex(0xfde047);
            item.bulbMat.emissiveIntensity = 1.2;
        } else {
            item.pointLight.intensity = 0.0;
            item.bulbMat.emissive.setHex(0x111827);
            item.bulbMat.emissiveIntensity = 0.05;
        }
    }

    setFanState(deviceId, state) {
        const item = this.fans[deviceId];
        if (!item) return;
        item.targetSpeed = state === 1 ? 0.22 : 0.0;
    }

    setApplianceState(deviceId, state) {
        const item = this.appliances[deviceId];
        if (!item) return;

        if (deviceId === "living_tv") {
            item.mat.emissive.setHex(state === 1 ? 0x0284c7 : 0x000000);
            item.mat.emissiveIntensity = state === 1 ? 0.8 : 0.0;
        } else if (item.ledMat) {
            item.ledMat.color.setHex(state === 1 ? 0x06b6d4 : 0x475569);
            item.ledMat.emissiveIntensity = state === 1 ? 1.2 : 0.0;
        }
    }

    setWaterLevel(percent) {
        this.waterLevel = Math.max(0.0, Math.min(100.0, percent));
        this.updateWaterMesh(this.waterLevel);
    }

    updateWaterMesh(percent) {
        if (!this.waterTank.waterMesh) return;

        const ratio = percent / 100.0;
        const currentHeight = Math.max(0.05, this.waterTank.maxHeight * ratio);
        
        this.waterTank.waterMesh.scale.set(1.0, currentHeight, 1.0);
        this.waterTank.waterMesh.position.y = this.waterTank.baseY + currentHeight / 2;

        if (percent <= 10.0) {
            this.waterTank.waterMat.color.setHex(0xef4444);
            this.waterTank.waterMat.emissive.setHex(0xef4444);
            this.waterTank.beacon.visible = true;
        } else if (percent <= 25.0) {
            this.waterTank.waterMat.color.setHex(0xf59e0b);
            this.waterTank.waterMat.emissive.setHex(0xf59e0b);
            this.waterTank.beacon.visible = true;
        } else {
            this.waterTank.waterMat.color.setHex(0x0284c7);
            this.waterTank.waterMat.emissive.setHex(0x0284c7);
            this.waterTank.beacon.visible = false;
        }
    }

    flyTo(room) {
        const presets = {
            overview: { cam: [22, 24, 25], target: [0, 0.5, 0] },
            living:   { cam: [-5.5, 12, 13], target: [-5.5, 1.0, 4.0] },
            bedroom:  { cam: [5.5, 12, 13], target: [5.5, 1.0, 4.0] },
            kitchen:  { cam: [-5.5, 12, -0.5], target: [-5.5, 1.0, -4.5] },
            utility:  { cam: [6.0, 11, -0.5], target: [6.0, 1.6, -4.5] }
        };

        const target = presets[room] || presets.overview;
        this.cameraTargetPos = new THREE.Vector3(...target.cam);
        this.controlsTargetPos = new THREE.Vector3(...target.target);
    }

    onPointerDown(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.interactiveMeshes, false);

        if (intersects.length > 0) {
            const hit = intersects[0].object;
            const deviceId = hit.name;
            if (deviceId && this.onDeviceClicked) {
                this.onDeviceClicked(deviceId);
            }
        }
    }

    onPointerMove(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.interactiveMeshes, false);

        this.container.style.cursor = intersects.length > 0 ? 'pointer' : 'default';
    }

    onWindowResize() {
        if (!this.container || !this.renderer || !this.camera) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(this.animate);

        // 1. Fan Rotations
        for (let key in this.fans) {
            const fan = this.fans[key];
            fan.currentSpeed += (fan.targetSpeed - fan.currentSpeed) * 0.05;
            if (fan.currentSpeed > 0.001) {
                fan.rotor.rotation.y += fan.currentSpeed;
                if (key === "kitchen_exhaust") {
                    fan.rotor.rotation.z += fan.currentSpeed;
                }
            }
        }

        // 2. Air Cooler Mist Particles Animation
        for (let key in this.coolers) {
            const c = this.coolers[key];
            if (c.active && c.mistGroup && c.mistGroup.visible) {
                c.mistGroup.children.forEach(m => {
                    m.position.z += 0.02;
                    if (m.position.z > 1.8) {
                        m.position.z = 0.2;
                        m.position.x = (Math.random() - 0.5) * 0.6;
                    }
                });
            }
        }

        // 3. Water Pump Vibration Effect
        if (this.pumps["utility_pump"] && this.pumps["utility_pump"].active) {
            this.pumps["utility_pump"].motor.position.y = 0.35 + Math.sin(Date.now() * 0.05) * 0.015;
        }

        // 4. Beacon Pulse
        if (this.waterTank.beacon && this.waterTank.beacon.visible) {
            const time = Date.now() * 0.005;
            this.waterTank.beacon.rotation.y += 0.03;
            const scale = 1.0 + Math.sin(time) * 0.25;
            this.waterTank.beacon.scale.set(scale, scale, scale);
        }

        // 5. Camera FlyTo Lerp
        if (this.cameraTargetPos && this.controlsTargetPos) {
            this.camera.position.lerp(this.cameraTargetPos, 0.06);
            this.controls.target.lerp(this.controlsTargetPos, 0.06);

            if (this.camera.position.distanceTo(this.cameraTargetPos) < 0.05) {
                this.cameraTargetPos = null;
                this.controlsTargetPos = null;
            }
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}
