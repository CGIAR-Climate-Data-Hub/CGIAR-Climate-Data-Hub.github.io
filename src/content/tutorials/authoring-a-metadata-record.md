---
title: Authoring a metadata record
description: Prepare, check, and submit a dataset metadata record to the Climate Action Data Hub.
audience: Anyone
topic: Onboarding
time: 30 min
format: Guide
outcomes:
  - Choose a way to author a metadata record
  - Gather the information needed to describe a dataset
  - Check and submit a record for review
updated: 2026-10-23
---

This guide outlines how to prepare and submit a metadata record for a dataset,
whether it is hosted by the Hub or an external provider. The
[metadata conventions](/wikis/metadata-conventions/) explain why the Hub uses
shared metadata. The standard's
[authoring guide](https://github.com/CGIAR-Climate-Data-Hub/cdh-metadata-standard/blob/main/spec/authoring-guide.md)
provides detailed field requirements and examples.

Review the submitted and approved records in the
[catalog repository](https://github.com/CGIAR-Climate-Data-Hub/cdh-catalog/tree/main/records)
to get an idea of the fields and the metadata shape. The
[website catalog](https://cgiar-climate-data-hub.github.io/catalog/) shows the
same records in a more human-readable format.

## Gather the source information

Start with the dataset's documentation, data links, and any associated
publications. Identify the release you are describing, who produced it, and who
can answer questions about it. Have the license and citation details available.

You can describe restricted or embargoed data too. In that case, gather the
access conditions and instructions for requesting access.

## Choose an authoring method

There are several ways to create a record:
- **Use the form.** The
  [metadata app](https://cgiar-climate-data-hub.github.io/CDH-metadata-app/)
  provides field descriptions, validation, and a submission option.
- **Use an AI agent.** The
  [cdh-metadata skill](https://github.com/CGIAR-Climate-Data-Hub/skills/tree/main/.agents/skills/cdh-metadata)
  helps draft a record from source documentation and data. See the
  [AI and agents page](/ai/) for how to use Hub skills.
- **Write YAML directly.** Start from a
  [validated example](https://github.com/CGIAR-Climate-Data-Hub/cdh-metadata-standard/tree/main/examples)
  and follow the authoring guide.

## Describe the dataset

Write a short description of what the data represents and what it can be used
for. Add the information needed to understand, access, and cite it:
- Dataset identifier and version, producer, and responsible contacts.
- Geographic and temporal coverage, including resolution where relevant.
- Variables, units, missing values, and any categories or dimensions.
- Source data and processing applied to produce the outputs.
- Data links, available formats, and access conditions.
- License, attribution, citation, and known limitations.

Use the fields provided by the standard. Tools can help extract technical
details, but contributors still need to explain what the data means and any
limitations on its use. For dataset identifiers and release versions, see the
[data conventions](/wikis/data-conventions/).

## Add additional metadata

Compile any additional metadata that may be useful for a user to access the
data. This can include code examples, documentation often provided with the
dataset, and categorical descriptions. An AGENTS.md file can also be included
and linked to from the record to provide additional usage guidelines and context
to AI agents. Do not repeat facts the record already states, such as extent or
license, in these files; duplicated facts drift apart.

## Check the record

Check the metadata against the source documentation and the data itself,
including any AI-generated content. Confirm that links point to the intended
release and that the record agrees with the data's variables, units, and
coverage.

Validate the record against the applicable schema using the metadata app or the
validation checklist in the
[authoring guide](https://github.com/CGIAR-Climate-Data-Hub/cdh-metadata-standard/blob/main/spec/authoring-guide.md#validation-checklist).
Passing validation checks the record's structure and required fields; it does
not confirm that every value is correct. Flag anything that needs clarification
during review.

## Submit for review

Submit through the metadata app or an issue or pull request to the
[catalog repository](https://github.com/CGIAR-Climate-Data-Hub/cdh-catalog).
Include any questions or gaps that need help from the reviewers.

Submissions follow the
[governance review process](/wikis/governance/#review-process) before
publication. Reviewers may ask for corrections or additional information. The
[contribute page](/contribute/) outlines the wider dataset submission process.
