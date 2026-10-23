import React from 'react';
import BlochSphere3D from './BlochSphere3D';

export default function BlochSphereView({ qubitIndex, blochVector, isEntangled, purity, height = 340 }) {
  return (
    <BlochSphere3D
      qubitIndex={qubitIndex}
      blochVector={blochVector}
      isEntangled={isEntangled}
      purity={purity}
      height={height}
    />
  );
}
