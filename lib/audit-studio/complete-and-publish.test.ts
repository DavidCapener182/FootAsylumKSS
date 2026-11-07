import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ complete: vi.fn(), publish: vi.fn() }));
vi.mock('./server', () => ({ completeAudit: mocks.complete }));
vi.mock('./store-records', () => ({ publishToStore: mocks.publish }));
import { completeAndPublishAudit } from './complete-and-publish';
const completed = { audit: { store_id: 'store', status: 'completed', document: { purpose: 'store' } }, publication: null };
beforeEach(() => { vi.resetAllMocks(); mocks.complete.mockResolvedValue(completed); });
describe('complete and publish store audit', () => {
  it('automatically saves the completed score and report to its own store', async () => {
    const published = { ...completed, publication: { audit_year: 2027, audit_number: 1 } };
    mocks.publish.mockResolvedValue(published);
    expect(await completeAndPublishAudit('audit', { revision: 2 }, { id: 'actor' })).toEqual(published);
    expect(mocks.publish).toHaveBeenCalledWith('audit', { storeId: 'store' }, { id: 'actor' });
  });
  it('keeps practice audits out of the tracker', async () => {
    mocks.complete.mockResolvedValue({ ...completed, audit: { ...completed.audit, document: { purpose: 'practice' } } });
    await completeAndPublishAudit('audit', {}, { id: 'actor' });
    expect(mocks.publish).not.toHaveBeenCalled();
  });
  it('retains the completed report and allows a retry after publication failure', async () => {
    mocks.publish.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ ...completed, publication: { audit_year: 2027, audit_number: 1 } });
    const result = await completeAndPublishAudit('audit', {}, { id: 'actor' });
    expect(result.audit.status).toBe('completed');
    expect(result.publicationError).toContain('not been added');
    expect((await completeAndPublishAudit('audit', {}, { id: 'actor' })).publication).toBeTruthy();
  });
  it('does not publish when completion fails or republish an attached report', async () => {
    mocks.complete.mockRejectedValueOnce(new Error('missing answers'));
    await expect(completeAndPublishAudit('audit', {}, { id: 'actor' })).rejects.toThrow('missing answers');
    mocks.complete.mockResolvedValue({ ...completed, publication: { audit_year: 2027, audit_number: 1 } });
    await completeAndPublishAudit('audit', {}, { id: 'actor' });
    expect(mocks.publish).not.toHaveBeenCalled();
  });
});
