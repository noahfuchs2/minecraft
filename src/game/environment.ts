import * as THREE from 'three';

export interface DayNightSettings {
  dayDurationSeconds: number; // e.g. 120s for a full day cycle
  initialTime?: number; // 0 to 1 (0 = sunrise, 0.25 = noon, 0.5 = sunset, 0.75 = midnight)
}

export class Environment {
  public scene: THREE.Scene;
  public timeOfDay: number = 0.25; // starts at noon
  public dayDuration: number = 240; // 4 minutes full cycle
  public paused: boolean = false;

  // Lights
  public sunLight: THREE.DirectionalLight;
  public ambientLight: THREE.AmbientLight;

  // Sky objects
  public sunMesh: THREE.Mesh;
  public moonMesh: THREE.Mesh;
  public cloudsMesh: THREE.Mesh;
  public celestialGroup: THREE.Group;

  // Sky colors
  private noonSkyColor = new THREE.Color('#78a7ff');
  private sunsetSkyColor = new THREE.Color('#d3623b');
  private nightSkyColor = new THREE.Color('#0a0e1c');
  private cloudColor = new THREE.Color('#ffffff');

  constructor(scene: THREE.Scene, settings?: DayNightSettings) {
    this.scene = scene;
    if (settings?.dayDurationSeconds) this.dayDuration = settings.dayDurationSeconds;
    if (settings?.initialTime !== undefined) this.timeOfDay = settings.initialTime;

    // Ambient light
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.ambientLight);

    // Sun directional light
    this.sunLight = new THREE.DirectionalLight(0xfffaed, 1.0);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 120;
    this.sunLight.shadow.camera.left = -30;
    this.sunLight.shadow.camera.right = 30;
    this.sunLight.shadow.camera.top = 30;
    this.sunLight.shadow.camera.bottom = -30;
    this.scene.add(this.sunLight);

    // Celestial parent group (rotates for day/night)
    this.celestialGroup = new THREE.Group();
    this.scene.add(this.celestialGroup);

    // Sun (Square billboard mesh)
    const sunGeo = new THREE.PlaneGeometry(16, 16);
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xfff6cf,
      side: THREE.DoubleSide,
      fog: false,
    });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.sunMesh.position.set(0, 100, 0);
    this.sunMesh.lookAt(0, 0, 0);
    this.celestialGroup.add(this.sunMesh);

    // Moon (Square billboard mesh opposite the sun)
    const moonGeo = new THREE.PlaneGeometry(12, 12);
    const moonMat = new THREE.MeshBasicMaterial({
      color: 0xe6edf8,
      side: THREE.DoubleSide,
      fog: false,
    });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.moonMesh.position.set(0, -100, 0);
    this.moonMesh.lookAt(0, 0, 0);
    this.celestialGroup.add(this.moonMesh);

    // Clouds (Chunky pixelated cloud layer at Y = 38)
    const cloudGeo = new THREE.PlaneGeometry(300, 300, 32, 32);
    cloudGeo.rotateX(-Math.PI / 2);
    const cloudMat = new THREE.MeshBasicMaterial({
      color: this.cloudColor,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      fog: true,
    });
    this.cloudsMesh = new THREE.Mesh(cloudGeo, cloudMat);
    this.cloudsMesh.position.set(0, 38, 0);
    this.scene.add(this.cloudsMesh);

    // Initial fog
    this.scene.fog = new THREE.FogExp2(this.noonSkyColor.getHex(), 0.015);

    this.updateAtmosphere(0);
  }

  public update(delta: number, playerPosition: THREE.Vector3) {
    if (!this.paused) {
      this.timeOfDay = (this.timeOfDay + delta / this.dayDuration) % 1.0;
    }

    // Keep celestial objects and clouds centered on player
    this.celestialGroup.position.copy(playerPosition);
    this.cloudsMesh.position.x = playerPosition.x + (this.timeOfDay * 40) % 20;
    this.cloudsMesh.position.z = playerPosition.z;

    this.updateAtmosphere(delta);
  }

  private updateAtmosphere(delta: number) {
    // timeOfDay:
    // 0.0 = Sunrise (sun on +X horizon)
    // 0.25 = Noon (sun directly above +Y)
    // 0.5 = Sunset (sun on -X horizon)
    // 0.75 = Midnight (sun directly below -Y, moon directly above)

    const angle = this.timeOfDay * Math.PI * 2;
    this.celestialGroup.rotation.z = angle - Math.PI / 2;

    // Sun position in world
    const sunDir = new THREE.Vector3(
      Math.cos(angle),
      Math.sin(angle),
      0
    ).normalize();

    this.sunLight.position.copy(this.celestialGroup.position).addScaledVector(sunDir, 60);
    this.sunLight.target.position.copy(this.celestialGroup.position);

    // Interpolate Sky Color based on sun height (sin(angle))
    const sunHeight = Math.sin(angle); // 1 = noon, 0 = horizon, -1 = midnight
    const currentSkyColor = new THREE.Color();

    if (sunHeight > 0.2) {
      // Daytime
      const t = Math.min(1.0, (sunHeight - 0.2) / 0.8);
      currentSkyColor.lerpColors(this.sunsetSkyColor, this.noonSkyColor, t);
      this.sunLight.intensity = 0.3 + 0.7 * t;
      this.ambientLight.intensity = 0.4 + 0.3 * t;
      this.sunLight.color.set('#fffaed');
    } else if (sunHeight > -0.2) {
      // Sunset / Sunrise transition
      const t = (sunHeight + 0.2) / 0.4;
      currentSkyColor.lerpColors(this.nightSkyColor, this.sunsetSkyColor, t);
      this.sunLight.intensity = 0.2 * t;
      this.ambientLight.intensity = 0.25 + 0.15 * t;
      this.sunLight.color.set('#ff8a4c');
    } else {
      // Nighttime
      currentSkyColor.copy(this.nightSkyColor);
      this.sunLight.intensity = 0.08;
      this.ambientLight.intensity = 0.22;
      this.sunLight.color.set('#889bc7');
    }

    this.scene.background = currentSkyColor;
    if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(currentSkyColor);
    }
  }

  public setTime(t: number) {
    this.timeOfDay = Math.max(0, Math.min(1, t));
  }
}
