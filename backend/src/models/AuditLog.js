import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    // The user who performed the action. Stored as ObjectId so we can join
    // back to User if needed, but the document remains readable even after
    // a User is deactivated.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    // Stable verb describing what happened.
    // Extend this enum as new auditable actions are introduced.
    action: {
      type: String,
      enum: {
        values: ['READ', 'LIST', 'CREATE', 'UPDATE', 'ARCHIVE'],
        message: 'Action must be one of: READ, LIST, CREATE, UPDATE, ARCHIVE',
      },
      required: [true, 'Action is required'],
    },
    // The Mongoose model name of the affected document (e.g. "MedicalRecord").
    resourceType: {
      type: String,
      required: [true, 'Resource type is required'],
      trim: true,
    },
    // The _id of the affected document. Stored as ObjectId when possible;
    // may be null for LIST actions where there is no single resource.
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    // Unstructured bag for caller-supplied context: field names changed,
    // query filters used, result counts, etc. Mixed type intentionally — we
    // don't want rigid schema constraints on audit metadata.
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
    // Explicit timestamp field (in addition to the createdAt from timestamps:true)
    // so queries like "all audit events in the last hour" can hit an index
    // without needing to know about Mongoose's internal timestamp field name.
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// Index for the most common audit query: "all events for resource X" and
// "all events by user Y ordered by time".
auditLogSchema.index({ resourceType: 1, resourceId: 1, timestamp: -1 });
auditLogSchema.index({ user: 1, timestamp: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
