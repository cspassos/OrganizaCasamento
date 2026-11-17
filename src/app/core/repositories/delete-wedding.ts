import { cloudBackend } from './cloud-backend';
export const deletedWeddingKey = (id: string) => 'deleted-wedding:' + id;
export const deleteWeddingData = (id: string) => cloudBackend.deleteWedding(id);
