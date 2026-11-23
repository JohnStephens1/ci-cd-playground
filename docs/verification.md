## Consumer & Evaluator Verification Guide

Downstream consumers, security evaluators, and auditors can independently verify the authenticity, integrity, SLSA Build Level 3 provenance, and SBOM attestations of released artifacts without placing blind trust in build claims.

### 1. Download Release Assets & Verify SHA-256 Checksums

Download the release assets into a local directory and verify the cryptographic distribution digests:

```bash
sha256sum -c SHA256SUMS
```

### 2. Verify SLSA Build Level 3 Provenance

Using the official [GitHub CLI](https://cli.github.com/) (`gh` v2.49.0+):

#### Online Verification (via Sigstore transparency log)

```bash
# Verify wheel provenance
gh attestation verify ci_cd_playground-0.1.17-py3-none-any.whl \
  --repo JohnStephens1/ci-cd-playground \
  --signer-workflow JohnStephens1/ci-cd-playground/.github/workflows/package-build.yml

# Verify sdist provenance
gh attestation verify ci_cd_playground-0.1.17.tar.gz \
  --repo JohnStephens1/ci-cd-playground \
  --signer-workflow JohnStephens1/ci-cd-playground/.github/workflows/package-build.yml
```

#### Offline Verification (using bundled attestation files)

```bash
gh attestation verify ci_cd_playground-0.1.17-py3-none-any.whl \
  --bundle package-provenance.intoto.jsonl \
  --repo JohnStephens1/ci-cd-playground \
  --signer-workflow JohnStephens1/ci-cd-playground/.github/workflows/package-build.yml

gh attestation verify ci_cd_playground-0.1.17.tar.gz \
  --bundle package-provenance.intoto.jsonl \
  --repo JohnStephens1/ci-cd-playground \
  --signer-workflow JohnStephens1/ci-cd-playground/.github/workflows/package-build.yml
```

### 3. Verify Individual SBOM Attestations

Verify that the Software Bill of Materials was cryptographically signed and bound to the exact distribution files:

```bash
# Wheel SBOM Attestation (Online & Offline)
gh attestation verify ci_cd_playground-0.1.17-py3-none-any.whl \
  --repo JohnStephens1/ci-cd-playground \
  --signer-workflow JohnStephens1/ci-cd-playground/.github/workflows/package-build.yml \
  --predicate-type https://spdx.dev/Document/v2.3

gh attestation verify ci_cd_playground-0.1.17-py3-none-any.whl \
  --bundle package-wheel-sbom.attestation.json \
  --repo JohnStephens1/ci-cd-playground \
  --signer-workflow JohnStephens1/ci-cd-playground/.github/workflows/package-build.yml \
  --predicate-type https://spdx.dev/Document/v2.3

# Sdist SBOM Attestation (Online & Offline)
gh attestation verify ci_cd_playground-0.1.17.tar.gz \
  --repo JohnStephens1/ci-cd-playground \
  --signer-workflow JohnStephens1/ci-cd-playground/.github/workflows/package-build.yml \
  --predicate-type https://spdx.dev/Document/v2.3

gh attestation verify ci_cd_playground-0.1.17.tar.gz \
  --bundle package-sdist-sbom.attestation.json \
  --repo JohnStephens1/ci-cd-playground \
  --signer-workflow JohnStephens1/ci-cd-playground/.github/workflows/package-build.yml \
  --predicate-type https://spdx.dev/Document/v2.3
```

### 4. Verify Published Container Images (GHCR)

Verify container image provenance and SBOM attestations against immutable image digests:

```bash
# Verify container SLSA provenance
gh attestation verify \
  "oci://ghcr.io/johnstephens1/ci-cd-playground@<IMAGE_DIGEST>" \
  --repo JohnStephens1/ci-cd-playground \
  --signer-workflow JohnStephens1/ci-cd-playground/.github/workflows/docker-publish.yml \
  --source-ref "refs/heads/main"

# Verify container SBOM attestation
gh attestation verify \
  "oci://ghcr.io/johnstephens1/ci-cd-playground@<IMAGE_DIGEST>" \
  --repo JohnStephens1/ci-cd-playground \
  --signer-workflow JohnStephens1/ci-cd-playground/.github/workflows/docker-publish.yml \
  --source-ref "refs/heads/main" \
  --predicate-type https://spdx.dev/Document/v2.3
```

### 5. Inspect Software Bill of Materials (SBOM)

Inspect the Syft-generated human-readable summary tables or query the machine-readable SPDX JSON:

```bash
# View human-readable component summaries
cat package-wheel.txt
cat package-sdist.txt

# Query packages and versions from SPDX JSON
jq '.packages[] | {name: .name, versionInfo: .versionInfo}' package-wheel.spdx.json
```
