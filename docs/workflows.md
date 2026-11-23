## System Architecture & Delivery Lifecycle

The software delivery lifecycle spans three distinct execution phases, each governed by cryptographic verification, automated testing, and quality gates:

```mermaid
---
config:
  layout: elk
  elk:
    nodePlacementAlignment: BALANCED
---
flowchart LR
    subgraph CI["1. Continuous Integration (ci.yml)"]
        direction LR
        PR["Pull Request / Push"] --> Lint["Ruff Check & Format"]
        PR --> TypeCheck["Pyright Type Check"]
        PR --> MatrixTest["Matrix Test (Python 3.10 - 3.13)<br/>Branch Coverage & Reports"]
        PR --> Bandit["Bandit SAST Scan"]
        PR --> Zizmor["Zizmor Actions Security"]
        PR --> BuildTest["Build (uv) & Smoke-Test Distributions"]
        PR --> DockerScan["Docker Build & Trivy Scan<br/>(validate-image action)"]
    end

    subgraph CD["2. Continuous Delivery & Rollback (cd.yml)"]
        direction TB
        Merge["Push to main"] --> CI_Gate["Verify CI Quality Gates"]
        CI_Gate --> DockerPub["Build & Validate Container<br/>Push to GHCR & Attest SLSA/SBOM"]
        DockerPub --> PreDeployStg["Verify OCI Attestations (gh attestation)"]
        PreDeployStg --> DeployStg["Deploy to Staging (Render API)"]
        DeployStg --> StgSmoke["Post-Deploy Smoke Test (/health, /version)"]
        StgSmoke --> PreDeployProd["Verify OCI Attestations (gh attestation)"]
        PreDeployProd --> DeployProd["Deploy to Production (Render API)"]
        DeployProd --> ProdSmoke{"Production Smoke Test<br/>(/health, /version)"}
        ProdSmoke -->|Pass| Live["Healthy Production Deployment"]
        ProdSmoke -->|Fail| AutoRollback["Automated Rollback (rollback.yml)<br/>Restore Previous Deploy ID"]
    end

    subgraph Release["3. Release & Supply-Chain Security (release.yml)"]
        direction TB
        Tag["Git Tag (v*)"] --> ValRef["Cryptographic Ref & Version Validation"]
        ValRef --> SLSA3Build["Trusted Builder (package-build.yml)<br/>Build Distributions strictly once"]
        SLSA3Build --> GenSBOM["Generate Syft SPDX SBOMs (wheel & sdist)"]
        GenSBOM --> Attest["Cryptographic Signing (Sigstore/OIDC)<br/>SLSA Level 3 Provenance & SBOM Attestations"]
        Attest --> TestDist["Clean-Room Install & Test Distributions"]
        TestDist --> AuditVerify["Independent Online & Offline Attestation Verification"]
        AuditVerify --> PubTestPyPI["Publish TestPyPI (OIDC Trusted Publishing)<br/>+ Clean-Room Install Smoke-Test"]
        PubTestPyPI --> PubPyPI["Publish PyPI (OIDC Trusted Publishing)<br/>+ PEP 740 Digital Attestations"]
        PubPyPI --> GHRelease["Create GitHub Release<br/>(Distributions, SBOMs, Attestations, Checksums)"]
    end

    CI ~~~ CD ~~~ Release
```
