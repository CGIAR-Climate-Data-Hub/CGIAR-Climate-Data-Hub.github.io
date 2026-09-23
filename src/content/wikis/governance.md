---
title: Governance Policy (Draft)
group: The Hub
updated: 2026-09-22
order: 2
---

**Version**: Draft Standard

## Purpose and Scope

This policy defines how the Climate Action Data Hub selects, publishes,
maintains, updates, and retires its resources. Its purpose is to keep the Hub
scientifically credible, useful, transparent, and maintainable over time.

The policy governs decisions about:

- which resources are included in or surfaced through the Hub;
- the ways resources are included, including through federated links and
  Hub-managed products;
- the minimum metadata, documentation, and quality checks required; and
- responsibility boundaries.

This policy applies to datasets and metadata records in the Hub, along with the
wikis, tutorials, other content, and the tools, pipelines, repositories, and
skills provided by the Hub. Changes to the Hub Metadata Standard, including its
schemas and controlled vocabularies, follow its own governance policy documented
in the
[metadata standard repository](https://github.com/CGIAR-Climate-Data-Hub/cdh-metadata-standard/).

The Hub aims to strengthen data practices outside the Hub by promoting best
practices and providing an example framework which others can build upon.

## Responsibilities

### Steering Committee

The Steering Committee provides strategic oversight for the Climate Action Data
Hub and ensures that its development remains aligned with CGIAR priorities,
relevant policies, and the needs of its users. It is not responsible for
routinely reviewing or approving individual resources; these responsibilities
remain with Resource Stewards, Reviewers, and Hub Maintainers.

The Steering Committee should include:

- Members from multiple CGIAR Centers
- Representatives from relevant CGIAR Science Programs
- Scientific or domain experts relevant to the Hub's scope
- At least two Hub Maintainers

The Committee should seek balanced institutional, disciplinary, geographic, and
gender representation.

### Maintainers

Hub Maintainers are responsible for the day-to-day governance, administration,
and operation of the Hub. They implement this policy and the strategic direction
established by the Steering Committee and act as the operational decision-makers
for the Hub. A Maintainer may be responsible for the Hub as a whole or for a
particular product or repository.

Maintainers administer the contribution and review process, apply publication
requirements, and oversee the lifecycle of Hub resources. They maintain
consistency across Hub resources, monitor resources, coordinate the resolution
of issues, maintain Hub products and documentation, and support Stewards,
contributors, and users.

### Resource Stewards

Each resource must have a named steward or responsible team. The steward
monitors the resource, responds to issues, maintains documentation, coordinates
updates and releases, and decides when it should be reviewed, updated,
deprecated, or withdrawn.

Dataset Stewards are recorded within the relevant metadata record and are often
the person or team submitting the resource to the Hub. For software products,
the steward is normally the package or repository maintainer or maintenance
team.

Hub Maintainers may act as Stewards if necessary or if they are the responsible
party. However, that responsibility should generally be on the person or team
submitting and providing the resource. Stewardship reverts to Hub Maintainers
when a steward leaves or is unable to maintain the resource, and is reassigned
to a relevant person or team.

For a federated resource, the steward is responsible for the accuracy and
currency of the metadata record. They are not necessarily responsible for
producing or maintaining the external data itself, but this may be the case if
they are also responsible for the upstream source.

### Reviewers

Reviewers are responsible for assessing whether a resource meets the Hub's
applicable requirements and is suitable for publication. They may request
changes to the resource as needed and approve the resource for publication in
accordance with the review process.

Reviewers are qualified individuals selected according to the expertise required
for a resource. They may be Hub Maintainers, Steering Committee members, members
of other CGIAR teams, or external experts.

All Hub Maintainers are expected to be active reviewers, and additional
reviewers are invited as needed when additional technical and scientific
expertise is required. Reviewers must disclose relevant conflicts of interest.
Authors and contributors may participate in discussion and respond to review
comments, but they must not approve their own submissions. Acting as a reviewer
does not make a person the ongoing steward of the resource.

## Review Process

All Hub resources must be reviewed before publication and inclusion in the Hub.
Review does not imply that the Hub has independently validated every value in a
dataset.

The review process assesses whether a resource is within the Hub’s scope, meets
an identifiable need, comes from a credible source, and satisfies the Hub’s
documentation, quality, and publication requirements.Depending on the type of
resource, review also considers scientific and technical quality, metadata,
licensing, accessibility, maintainability, security, and the results of
applicable validation and quality checks.

Review also considers existing resources in the Hub to avoid redundancy and
overlap. In instances of substantial overlap, both resources are assessed and a
decision is made by the Hub Maintainers, either to include both, with clear
reasoning and documentation on the scope of each resource, or to exclude one or
the other.

Dataset submissions must be reviewed and approved by at least two reviewers
before they are published to the Hub. The review must cover the scientific and
domain suitability, as well as the technical, metadata, and licensing
requirements. Wikis, tutorials, skills, and similar content must be reviewed by
at least one suitable reviewer before they are published. Software and code
follow repository-specific review processes for security, maintainability, and
quality based on their scope and maturity. Minor changes and corrections to
existing resources may be approved by a single reviewer.

Reviewers must not be the approvers of resources they produced or submitted. Any
disagreements are first addressed by the Hub Maintainers and other reviewers.
Unresolved disagreements are referred to the Steering Committee for resolution.

## Lifecycle and Maintenance

Resource Stewards and Hub Maintainers are responsible for ensuring that
resources remain current and relevant to the Hub. For federated resources,
Stewards must review and update the metadata record when the upstream data,
license, access conditions, or lifecycle status change.

Each ongoing or open-ended dataset must document its expected update frequency,
or explicitly state that updates are irregular or the schedule is unknown. For
externally maintained datasets, this must reflect the provider’s stated
schedule. Where the Hub maintains a copy, its refresh schedule must also be
documented. Stewards must keep this information current and record known delays
or cessation of updates.

Published data versions must not be overwritten. A new dataset version must be
created whenever values, coverage, methodology, structure, or other
characteristics change in a way that could affect a user's results or
interpretation. For federated resources, the Hub records upstream versions and
known changes but cannot guarantee the provider's versioning practices or
continued availability. Metadata records may be corrected or updated without
creating a new dataset version when the underlying data have not changed. These
revisions must be documented and traceable through version control.

Where the Hub holds an optimized copy of a dataset for easier or cloud-native
access, it may remove that copy for a superseded edition if the authoritative
source remains available. The metadata record is retained and must resolve to a
stable, accessible location for that edition, verified at the time of removal.
Where no such location exists, the Hub's copy is retained. Any removals should
be documented in the metadata record.

Wikis, tutorials, and web content do not require formal versioning, but their
revision history must be tracked and made accessible through Git. Software and
code must be versioned using the applicable repository-specific processes, with
changes recorded through releases or changelogs where appropriate. Versioning of
the Hub Metadata Standard and controlled vocabularies follows the Hub metadata
governance policy.

Errors and issues must be recorded in the relevant issue tracker. Errors in
federated datasets should be reported to the provider and noted in the Hub
record while unresolved. Errors in Hub-produced resources must be corrected
through the applicable review and versioning process, with the error,
correction, and any affected outputs documented. Hub Maintainers may temporarily
suspend access to a resource when errors require immediate attention.

A resource may be deprecated if it is superseded, no longer relevant or
suitable, unmaintained, or if a more suitable resource is available. A resource
may be withdrawn if it is no longer available or if access raises serious
quality, licensing, security, or ethical concerns. Resource Stewards and Hub
Maintainers may recommend deprecation or withdrawal, and the record must be
updated to identify the reason and proposed replacement resources.

## Dataset Inclusion Criteria

A dataset may be included when it falls within the Hub's scope, serves an
identifiable user need, and comes from a credible provider with a documented
production process. It must have sufficient metadata and documentation to
understand its contents, provenance, methods, quality, access, and limitations.
Datasets are not required to be publicly open, but access conditions must be
clear.

Selection should consider scientific quality, geographic and temporal fitness,
provider reliability, documentation, licensing, accessibility, interoperability,
and the sustainability of maintaining the resource.

Contributors are expected to work with Hub Maintainers and Reviewers to ensure
that the metadata record is complete and the dataset meets the inclusion
criteria. Maintainers and Reviewers may request revisions or additional metadata
before publication.

Inclusion indicates that a dataset is suitable for one or more stated uses; it
does not imply that it is the best dataset for every purpose. Where several
datasets address the same need, the Hub should document why each is included and
which uses each is best suited to.

Datasets with substantial overlap may both be included when they provide
distinct methods, coverage, resolution, update frequency, accessibility, or
other user value. Where datasets are otherwise comparable, priority may be given
to openly accessible datasets carrying more permissive licenses.

### Resource classes

For all classes, the Hub is responsible for exercising curatorial judgment in
dataset inclusion, the metadata record, and recording known quality issues and
limitations. For resources hosted by the Hub, it is responsible for storage,
integrity, access, service continuity, and technical QA/QC.

Scientific methods and validity, licensing, QA/QC, source documentation, and
scientific support are the responsibility of the provider and data producer.

| Resource class | Description                                                      | Hub responsibility                                                                                                             | Provider responsibility                                                               |
| -------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Federated      | Resources are stored and maintained elsewhere                    | Metadata, alignment of metadata with upstream source, link monitoring, status of upstream source, and communication of changes | Hosting, scientific production, quality, upstream updates, and primary support        |
| Hub-harmonized | Hub-managed copy of federated resource to increase accessibility | Transformation accuracy and reproducibility, provenance, documentation, and alignment with the identified upstream version     | Scientific quality, versioning, accuracy, and continuity of the upstream source       |
| Hub-hosted     | Hub is the primary host for resources produced elsewhere         | Data integrity, accessibility, version management, usage documentation, and technical support                                  | Scientific methods, validation, documentation, updates, QA/QC, and scientific support |
| Hub-produced   | The Hub is the primary producer of the resource                  | Methods, scientific quality, versioning, quality control, licensing                                                            | -                                                                                     |

## Transparency

The Hub uses open and version-controlled repositories, issues, and pull requests
to record contributions, reviews, material decisions, and policy changes.
Resource records should make their provenance, limitations, lifecycle status,
steward, and material changes visible to users.

## FAIR Alignment

The Hub manages its resources in alignment with the
[CGIAR Open and FAIR Data Policy](https://hdl.handle.net/10568/113623) and the
FAIR Data Principles, as appropriate for each type of resource. Further, the Hub
aims to promote and advance FAIR practices in the community by providing
examples, resources, tools, and frameworks that can be adopted by others.

All Hub metadata records must be open, follow the Hub Metadata Standard, and be
maintained in the Hub metadata catalog, even when access to the underlying
resource is restricted. Metadata records must use stable identifiers and remain
accessible when a resource is superseded, deprecated, or no longer available.
Supplementary metadata should be stored in the Hub catalog where practical or
referenced through a stable, openly accessible identifier, subject to legal and
ethical constraints.

Resources should use open, standard, machine-readable formats wherever possible.
Every record must identify the resource's producer and document or reference its
provenance and production methods, as applicable, so users can assess its
fitness for their purposes. Hub-produced resources are maintained in Git-based
version control so that their revision history remains traceable and they can be
easily rebuilt or reused.

### Licensing

All datasets and other resources must carry a valid license before inclusion in
the Hub. All resources produced by the Hub, such as wikis, tutorials, and
software, are published under standard permissive licenses. Normally these are
CC BY for content and MIT or Apache for software. Externally produced and
federated datasets may carry more restrictive licenses if necessary. Every
record must carry the attribution and citation details the license requires.
Resources without clear licensing and reuse terms must not be published until
those terms have been clarified.

For federated resources, the metadata record must accurately reflect the license
and access conditions established by the external provider. Inclusion in the Hub
does not alter or supersede those conditions. The Hub may copy, transform, or
redistribute an externally maintained resource only where its license or another
agreement permits it.

## Policy Changes

Changes to this policy, the scope of the Hub, or its dataset-selection
requirements must be approved by the Steering Committee or a designated
governance group after consultation with Hub Maintainers.
