# Person Cleanup Function

## Overview

The `completelyRemovePerson` function in `personCleanup.ts` provides comprehensive cleanup when a person is completely removed from the system. This ensures that all related data is properly deleted from the database and storage.

## What it cleans up

When a person is completely removed, the function removes their data from:

1. **`weitere_antragstellende_personen`** - The JSON field containing additional applicants
2. **`additional_applicants_financials`** - The JSON field containing financial data for additional applicants
3. **`document_status`** - The JSON field containing file metadata for uploaded documents
4. **`additional_documents`** - The JSON field containing lists of additional document types
5. **Storage bucket** - All actual files stored in the `documents` bucket under the person's folder

## Storage Structure

Files are stored in the following structure:
```
documents/
└── {userId}/
    └── applicant_{personId}/
        └── {documentType}/
            └── {fileName}
```

When a person is removed, the entire `applicant_{personId}` folder and all its contents are deleted.

## Usage

The function is used in both `HaushaltContainer` and `HauptantragContainer` when the user chooses to completely remove a person:

```typescript
await completelyRemovePerson(user.id, personId);
```

## Error Handling

- If storage deletion fails, the function continues with database cleanup
- Storage errors are logged but don't prevent the overall cleanup
- Database errors are thrown and will stop the cleanup process
- The function provides detailed logging for debugging

## Safety Features

- Files are deleted in batches to avoid overwhelming the storage API
- All database operations are performed in parallel for efficiency
- The function handles cases where data might not exist (graceful degradation)
- Comprehensive error logging for troubleshooting 