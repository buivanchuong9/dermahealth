import { http } from "./http";

export interface Organization {
  id: string;
  code: string;
  name: string;
  status: string;
  version: number;
}

export interface ClinicLocation {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  timezone: string;
  address: string | null;
  status: string;
}

export interface Department {
  id: string;
  clinicLocationId: string | null;
  code: string;
  name: string;
  status: string;
}

export const listOrganizations = () =>
  http.get<Organization[]>("/api/v1/organizations");

export const listClinicLocations = () =>
  http.get<ClinicLocation[]>("/api/v1/clinic-locations");

export const listDepartments = () =>
  http.get<Department[]>("/api/v1/departments");
