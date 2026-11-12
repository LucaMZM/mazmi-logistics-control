import { Vehicle } from '../../shared/models/models';

export function vehicleRepresentation(vehicle: Vehicle) {
  return {
    id: vehicle.id,
    asset: vehicle.vehicleType === 'VAN' ? 'delivery-van' : null,
    fidelity: 'Generic original representation',
    color: '#dce1e4',
    plate: vehicle.registrationPlate,
  } as const;
}

// Canvas text, never HTML. Limit texture work independently of backend validation.
export function plateLabel(value: string): string {
  return [...value]
    .filter((character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127)
    .join('')
    .slice(0, 24);
}
