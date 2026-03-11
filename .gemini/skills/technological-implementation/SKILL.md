---
name: technological-implementation
description: Guidelines and templates for Azure (Functions / Container Apps), with logs in Azure Monitor / Application Insights and traces stored in Cosmos DB or Blob. A tiny GitHub repo with IaC (Bicep/Terraform script or simple ARM template), clean folder structure and docs shows “production readiness” and “well‑structured code” even if feature scope is small.
---

# Technological Implementation

This skill provides guidance for building "production-ready" Azure-based solutions with clean architecture and observability.

## Core Components

- **Compute**: Azure Functions or Container Apps
- **Observability**: Azure Monitor / Application Insights for logs
- **Persistence**: Cosmos DB or Blob Storage for traces/data
- **Infrastructure as Code (IaC)**: Bicep, Terraform, or ARM templates
- **Project Structure**: Clean, well-structured folder organization

## Workflow

1.  **Define Infrastructure**: Use Bicep or Terraform to provision Azure resources.
2.  **Clean Code Structure**: Organize files logically, e.g., `src/`, `infra/`, `docs/`.
3.  **Implement Observability**: Configure Application Insights in the application code.
4.  **Data Management**: Setup Cosmos DB or Blob Storage as needed.
5.  **Documentation**: Include `README.md` and architecture diagrams.

## Assets & References

- See `references/` for IaC templates.
- See `assets/` for boilerplate code or configuration examples.
