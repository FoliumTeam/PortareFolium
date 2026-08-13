# Aigent Hive installed harness

Files under this `.hive/` directory and exact Aigent Hive marker blocks generated into shared files are licensed under Apache License 2.0. The license text is stored in `.hive/LICENSE-AIGENT-HIVE.txt`.

This license applies only to Aigent Hive-provided material. It does not change the license of the consumer project's own source, documentation, configuration, or data.

Canonical project knowledge lives under `.hive/knowledge/`. Markdown and YAML are
tracked source; `.hive/index/hive.sqlite3` is disposable and can be rebuilt with:

```text
hive index rebuild --target . --output json
hive knowledge query --target . --text "<terms>" --output json
hive knowledge lint --target . --output json
```

Do not edit an existing Raw revision. Ingest a changed source as a new
content-addressed revision. Deleted prose is not copied into `suppression.yml`.
