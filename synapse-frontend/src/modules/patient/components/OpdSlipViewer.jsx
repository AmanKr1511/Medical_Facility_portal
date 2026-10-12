import { useCallback, useState } from 'react';
import { Modal } from '../../../core/ui';

/**
 * PLACEHOLDER for the OPD slip screen (wireframe intentionally skipped until the
 * API JSON is agreed). Every "View OPD Slip" / "View" button goes through this hook,
 * so the real viewer only has to be built here.
 *
 *   const { openSlip, slipViewer } = useOpdSlipViewer();
 *   <Button onClick={() => openSlip(visit.id)} />   ...   {slipViewer}
 */
export function useOpdSlipViewer() {
  const [visitId, setVisitId] = useState(null);
  const close = useCallback(() => setVisitId(null), []);

  const slipViewer = visitId ? (
    <Modal title="OPD Slip" onClose={close}>
      <p style={{ textAlign: 'center', color: 'var(--c-muted)' }}>
        The digital OPD slip for this visit will be shown here once the API format is finalised.
      </p>
    </Modal>
  ) : null;

  return { openSlip: setVisitId, slipViewer };
}
