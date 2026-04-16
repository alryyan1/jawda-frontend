# Device Normal Range — All Changes

## Overview
Adds support for device-specific normal ranges per child test (e.g. Roche, Snibe, Mindray).  
The default device range is automatically applied when a lab request is created.

---

## Backend (`jawda-medical`)

### Migrations

| File | What it does |
|------|-------------|
| `database/migrations/system_setup/2024_01_01_000831_add_timestamps_user_to_child_test_devices.php` | Adds `user_id` (FK → users, nullable), `created_at`, `updated_at` to `child_test_devices` |
| `database/migrations/system_setup/2024_01_01_000832_add_is_default_to_child_test_devices.php` | Adds `is_default boolean default false` to `child_test_devices` |

### Models

**`app/Models/DeviceChildTestNormalRange.php`**
- `$fillable` → added `user_id`, `is_default`
- `$timestamps = true`
- `$casts` → `is_default` cast as `boolean`
- Added `user()` → `belongsTo(User::class)`

**`app/Models/ChildTest.php`**
- Added `deviceNormalRanges()` → `hasMany(DeviceChildTestNormalRange::class, 'child_test_id')`

### Controllers

**`app/Http/Controllers/Api/DeviceController.php`**
- Added `update(Request, Device)` — validates unique name (ignoring self), returns `DeviceResource`
- Added `destroy(Device)` — deletes and returns 204

**`app/Http/Controllers/Api/DeviceChildTestNormalRangeController.php`**
- Added `listForChildTest(ChildTest)` — returns all ranges for a child test with `device` eager-loaded
- Updated `storeOrUpdateNormalRange` — now accepts `is_default` boolean; when `true`, clears the flag from all other devices for the same `child_test_id` first (only one default allowed per child test); saves `user_id` from `auth()->id()`

**`app/Http/Controllers/Api/LabRequestController.php`** (line ~836 & ~936)
- Line 836 eager load changed from `childTests.unit` to also include:
  ```php
  'childTests.deviceNormalRanges' => fn($q) => $q->where('is_default', true)
  ```
- Line 936 `normal_range` priority chain:
  ```php
  $childTest->deviceNormalRanges->firstWhere('is_default', true)?->normal_range
      ?? $childTest->normalRange
      ?? ($childTest->low && $childTest->upper ? "$childTest->low - $childTest->upper" : null)
  ```

### Resources

**`app/Http/Resources/DeviceChildTestNormalRangeResource.php`**
- Added `device_name` (via `whenLoaded`)
- Added `is_default`
- Added `user_id`, `created_at`, `updated_at`

### Routes (`routes/api.php`)

```
PUT    /devices/{device}                                          → DeviceController@update
DELETE /devices/{device}                                          → DeviceController@destroy
GET    /child-tests/{child_test}/device-normal-ranges             → listForChildTest
GET    /child-tests/{child_test}/devices/{device}/normal-range    → getNormalRange  (existing)
POST   /child-tests/{child_test}/devices/{device}/normal-range    → storeOrUpdateNormalRange  (existing)
```

---

## Frontend (`jawda-frontend`)

### Types

**`src/types/labTests.ts`**
```ts
export interface Device {
  id: number;
  name: string;
}

export interface DeviceNormalRange {
  id: number;
  child_test_id: number;
  device_id: number;
  device_name?: string;
  normal_range: string;
  is_default: boolean;
  user_id?: number | null;
  created_at?: string;
  updated_at?: string;
}
```

**`src/types/labWorkflow.ts`** — added to `ChildTestWithResult`:
```ts
device_normal_ranges?: Array<{
  id: number;
  device_id: number;
  device_name?: string | null;
  normal_range: string;
  is_default?: boolean;
}>;
```

### Services (new files)

**`src/services/deviceService.ts`**
- `getDevicesList()` → `GET /devices-list`
- `createDevice(data)` → `POST /devices`
- `updateDevice(id, data)` → `PUT /devices/{id}`
- `deleteDevice(id)` → `DELETE /devices/{id}`

**`src/services/deviceNormalRangeService.ts`**
- `getDeviceNormalRangesForChildTest(childTestId)` → `GET /child-tests/{id}/device-normal-ranges`
- `setDeviceNormalRange(childTestId, deviceId, data)` → `POST /child-tests/{id}/devices/{deviceId}/normal-range`
  - `data: { normal_range: string; is_default?: boolean }`

### Components (new files)

**`src/components/lab/ManageDevicesDialog.tsx`**
- Global device CRUD dialog (add Roche, Snibe, Mindray, etc.)
- Inline add/edit form + table with edit/delete per row
- Opened from the "إدارة الأجهزة" button in `ChildTestsManagementPage`

**`src/components/lab/ManageDeviceNormalRangesDialog.tsx`**
- Per-child-test dialog listing all devices with editable normal range fields
- Each row: multiline text field + Save button + Star/default toggle
- Star button (`StarOff` / `Star`) marks a device as default; backend clears all other defaults automatically
- Default row highlighted; chip turns amber when default is set

### Components (modified)

**`src/components/lab/management/ChildTestDisplayRow.tsx`**
- Added `onManageDeviceRanges?: (childTest) => void` and `canManageDeviceRanges?: boolean` props
- New `DeviceHub` icon button in Actions cell → opens `ManageDeviceNormalRangesDialog`
- Normal range cell changed from plain text to **read-only multiline `TextField`** (min 1 row, max 4 rows, transparent border)

**`src/components/lab/management/ChildTestsTable.tsx`**
- Added `onManageDeviceRanges` and `canManageDeviceRanges` props; passed through to each `ChildTestDisplayRow`

**`src/pages/lab/ChildTestsManagementPage.tsx`**
- State: `devicesDialogOpen`, `managingDeviceRangesFor`
- "إدارة الأجهزة" button in page header → opens `ManageDevicesDialog`
- `onManageDeviceRanges` callback → opens `ManageDeviceNormalRangesDialog` for the clicked child test
- Renders both `<ManageDevicesDialog>` and `<ManageDeviceNormalRangesDialog>`

**`src/components/lab/workstation/ResultEntryPanel.tsx`**
- Backend now sends `device_normal_ranges[]` for each child test in the result-entry payload
- When a child test is selected and has device ranges, a `DeviceHub` icon appears next to the "Normal Range" heading
- Clicking opens a MUI `Menu` listing each device + its configured range
- Selecting a device: fills the textarea **and** immediately calls `saveNormalRange()` → `PATCH /labrequests/{id}/childtests/{childTestId}/normal-range` → saves to `requested_results.normal_range`
