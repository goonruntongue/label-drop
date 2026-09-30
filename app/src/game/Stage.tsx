import { Canvas } from '@react-three/fiber';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { useGame } from '../state/store';
import { THEMES } from '../theme/themes';
import { Backdrop, SceneEnvironment } from './Backdrop';
import { Blocks } from './Blocks';
import { Director } from './Director';
import { Guide } from './Guide';
import { CAMERA_Y, CAMERA_Z, drag, FOV } from './runtime';
import { Trays } from './Trays';

export function Stage() {
  const bloom = useGame((s) => s.tuning.bloom);
  const theme = THEMES[useGame((s) => s.theme)];
  return (
    <Canvas
      flat
      dpr={[1, 2]}
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
      camera={{ position: [0, CAMERA_Y, CAMERA_Z], fov: FOV, near: 0.1, far: 80 }}
      onPointerMissed={() => {
        if (!drag.active) useGame.getState().select(null);
      }}
    >
      <color attach="background" args={[theme.background]} />
      <fog attach="fog" args={[theme.fog, 18, 42]} />
      <SceneEnvironment />
      <ambientLight intensity={theme.ambient} />
      <directionalLight position={[-5, 7, 9]} intensity={1.6} />
      <directionalLight position={[6, 3, -6]} intensity={1.1} color={theme.accent} />
      <Backdrop />
      <Trays />
      <Blocks />
      <Guide />
      <Director />
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.2} intensity={bloom * theme.bloom} radius={0.72} />
        <Vignette offset={0.28} darkness={theme.vignette} />
      </EffectComposer>
    </Canvas>
  );
}
