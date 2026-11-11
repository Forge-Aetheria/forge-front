# EARS Specification: FE-INV-INFRA: Integración de Administración de Almacenes y Ubicaciones Físicas con GraphQL

- **Ticket**: legacy TICK-022-fe-inv-warehouses-locations-crud (file not present in .agents/tickets/)
- **Repository**: forge-front
- **Domain**: forge-front
- **Date**: 2026-11-10
- **Format**: EARS (Easy Approach to Requirements Syntax)
- **Status**: Draft

## Context

In `forge-front`, the physical infrastructure settings for warehouses (`/inventory/settings/warehouses`) and stock locations (`/inventory/settings/locations`) currently persist facilities and shelf hierarchies in browser `localStorage` via `src/services/inventory/categoryWarehouseService.ts`.

In `forge-backend`, the inventory domain (`src/modules/inventory`, BE-INV-03) provides live infrastructure resolvers:
- Warehouses (`warehouses`, `warehouse(id)`, `createWarehouse`, `updateWarehouse`) enforcing company-scoped code uniqueness, manager assignments, and default warehouse designations.
- Stock locations (`stockLocations`, `stockLocation(id)`, `createStockLocation`, `updateStockLocation`) calculating recursive hierarchical paths (`completePath`), enforcing cycle prevention, and supporting usage types (`INTERNAL`, `SUPPLIER`, `CUSTOMER`, `INVENTORY_LOSS`, `TRANSIT`, `PRODUCTION`).

Connecting `forge-front` to these endpoints establishes real multi-warehouse physical topology.

## EARS Requirements

### Ubiquitous

- **REQ-U-001** The system SHALL declare `GET_WAREHOUSES_QUERY`, `CREATE_WAREHOUSE_MUTATION`, `UPDATE_WAREHOUSE_MUTATION`, `CREATE_STOCK_LOCATION_MUTATION`, and `UPDATE_STOCK_LOCATION_MUTATION` in `src/graphql/inventory.gql.ts`.
- **REQ-U-002** The system SHALL maintain hierarchical location display using `completePath` returned by the server.

### Event-driven (When)

- **REQ-E-001** WHEN the user registers a new warehouse on `/inventory/settings/warehouses`, the system SHALL execute `createWarehouse` sending code, name, address, manager, and default flag.
- **REQ-E-002** WHEN the user updates an existing warehouse, the system SHALL execute `updateWarehouse` with modified properties.
- **REQ-E-003** WHEN the user creates an internal shelf, aisle, or bin on `/inventory/settings/locations`, the system SHALL execute `createStockLocation` linking `warehouseId`, `parentId`, and location type.
- **REQ-E-004** WHEN viewing warehouse settings, the system SHALL query live data from `warehouses` and `stockLocations`.

### State-driven (While)

- **REQ-S-001** WHILE a warehouse or location mutation is in transit, the system SHALL disable submission buttons and show a loading spinner.

### Unwanted (If / Then)

- **REQ-N-001** IF the entered warehouse code is already taken in the tenant, THEN the system SHALL capture the uniqueness error and display an inline alert.
- **REQ-N-002** IF a location assignment would form a circular parent reference, THEN the system SHALL block submission and alert the user.

## Acceptance criteria

- **AC-001** GIVEN `/inventory/settings/warehouses`, WHEN adding a new warehouse, THEN the system SHALL execute `createWarehouse` and render the facility with server UUID.
- **AC-002** GIVEN `/inventory/settings/locations`, WHEN adding a child location under an existing shelf, THEN the system SHALL execute `createStockLocation` and display the updated `completePath`.
- **AC-003** GIVEN a duplicate warehouse code, WHEN submitting, THEN the system SHALL surface the conflict error alert.

## Out of scope

- Automated IoT sensor / temperature logging per location.
- 3D warehouse isometric visualization.

## Assumptions

- Authenticated tenant has permission to manage inventory infrastructure (`inventory:warehouse:*`, `inventory:location:*`).

## Open questions

- None.
