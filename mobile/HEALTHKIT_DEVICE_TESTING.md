# Apple Health device checks

Run these checks on a physical iPhone or iPad with iOS 16.4 or later. HealthKit is unavailable in the simulator. Use a development build connected to a LifeOS server reachable over the device's network, and seed test Health data for the selected categories.

1. In LifeOS, select only Steps and connect. Confirm the Health authorization flow is read-only, sync completes, and only step samples reach the signed-in owner's `/api/v1/health/samples` endpoint. Repeat sync and confirm the sample count does not increase.
2. In the Health app, remove a test step sample and sync LifeOS again. Confirm that sample is removed from LifeOS. Pause syncing, try Sync, and confirm no sync request is sent; resume and confirm syncing works again.
3. Create a manual LifeOS health sample, then disconnect Apple Health. Confirm imported samples are removed while the manual sample remains. Reconnect and confirm the same source can sync again.
4. In the Health app, revoke LifeOS read access and sync again. HealthKit intentionally does not tell apps whether read access was denied or revoked, so do not expect a permission-denied signal. Confirm LifeOS does not write to HealthKit; review the Health app's access settings to verify revocation. Previously imported samples remain until the owner explicitly disconnects and deletes them.

Record the iOS version/device, selected categories, and observed results when executing this checklist. Automated tests cover API ownership/deletion and the mobile orchestration separately.
