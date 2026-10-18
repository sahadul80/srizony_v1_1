import { defineConfig } from '@neon/config/v1'

export default defineConfig({
  auth: true,
  buckets: {
    // Private by default: reports, submitted documents and internal attachments.
    uploads: { access: 'private' },
    // Public-read, authenticated-write bucket for approved website images.
    // Never upload personal documents or internal files to this bucket.
    'public-assets': { access: 'public_read' },
  },
})
