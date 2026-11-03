import { CollectionName } from '../types/storage';
import { Patient, Appointment, Visit, InAppNotification, StaffAccessRecord, PatientAssignment } from '../types';
import { Invoice, Payment } from '../types/billing';
import { AttendanceRecord, LeaveRequest, Shift, DayOfWeek, LeaveType } from '../types/attendance';
import { Medicine } from '../types/prescribing';
import { Account } from '../types/storage';

export const TABLE_MAP: Partial<Record<CollectionName, string>> = {
  accounts: 'accounts',
  staff: 'staff',
  patients: 'patients',
  assignments: 'patient_assignments',
  appointments: 'appointments',
  visits: 'visits',
  prescriptions: 'prescriptions',
  invoices: 'invoices',
  payments: 'payments',
  attendance: 'attendance',
  leave: 'leave_requests',
  shifts: 'shifts',
  formulary: 'formulary',
  ledger: 'access_audit_log',
  notifications: 'notifications',
};

// Tables that are global (not scoped to clinic_id)
export const GLOBAL_TABLES = new Set<string>(['clinics']);

/**
 * Converts a database snake_case row to the application's domain model.
 */
export function fromDatabaseRow<T>(collection: CollectionName, row: any): T {
  if (!row) return row;

  switch (collection) {
    case 'patients': {
      const p: Patient = {
        id: row.id,
        mrn: row.mrn || '',
        firstName: row.first_name || '',
        lastName: row.last_name || '',
        gender: row.gender || 'other',
        dob: row.dob || '',
        age: Number(row.age) || 0,
        phone: row.phone || '',
        email: row.email || '',
        address: row.address || '',
        bloodGroup: row.blood_group || undefined,
        allergies: Array.isArray(row.allergies) ? row.allergies : [],
        chronicConditions: Array.isArray(row.chronic_conditions) ? row.chronic_conditions : [],
        emergencyContact: {
          name: row.emergency_contact_name || '',
          relationship: row.emergency_contact_relationship || '',
          phone: row.emergency_contact_phone || '',
        },
        registeredDate: row.registered_date || new Date().toISOString().split('T')[0],
        status: row.status === 'inactive' ? 'inactive' : 'active',
        lastVisitDate: row.last_visit_date || undefined,
        source: row.source || 'reception',
        registeredBy: row.registered_by_id
          ? { id: row.registered_by_id, name: row.registered_by_name || '' }
          : undefined,
        createdAt: row.created_at,
      };
      return p as unknown as T;
    }

    case 'appointments': {
      const a: Appointment = {
        id: row.id,
        appointmentNumber: row.appointment_number || '',
        patientId: row.patient_id || '',
        patientName: row.patient_name || '',
        patientPhone: row.patient_phone || '',
        doctorId: row.doctor_id || '',
        doctorName: row.doctor_name || '',
        department: row.department || '',
        dateTime: row.date_time || new Date().toISOString(),
        durationMinutes: Number(row.duration_minutes) || 15,
        status: row.status || 'scheduled',
        reasonForVisit: row.reason_for_visit || '',
        chiefComplaint: row.chief_complaint || '',
        tokenNumber: Number(row.token_number) || 1,
        consultationRoom: row.consultation_room || '',
        source: row.source || 'reception',
        checkedInAt: row.checked_in_at || null,
        checkedInBy: row.checked_in_by_id
          ? { id: row.checked_in_by_id, name: row.checked_in_by_name || '' }
          : null,
        bookedBy: row.booked_by_id
          ? { id: row.booked_by_id, name: row.booked_by_name || '' }
          : null,
        cancelledAt: row.cancelled_at || null,
        cancelledBy: row.cancelled_by_id
          ? { id: row.cancelled_by_id, name: row.cancelled_by_name || '' }
          : null,
        cancelReason: row.cancel_reason || null,
        notes: row.notes || undefined,
      };
      return a as unknown as T;
    }

    case 'visits': {
      const v: Visit = {
        id: row.id,
        patientId: row.patient_id || '',
        appointmentId: row.appointment_id || undefined,
        doctorId: row.doctor_id || '',
        date: row.visit_date || new Date().toISOString().split('T')[0],
        reason: row.reason || '',
        notes: row.notes || undefined,
        vitals: {
          systolicBp: row.systolic_bp || undefined,
          diastolicBp: row.diastolic_bp || undefined,
          heartRateBpm: row.heart_rate_bpm || undefined,
          oxygenSaturationPct: row.oxygen_saturation_pct ? Number(row.oxygen_saturation_pct) : undefined,
          temperatureCelsius: row.temperature_celsius ? Number(row.temperature_celsius) : undefined,
        },
      };
      return v as unknown as T;
    }

    case 'attendance': {
      const att: AttendanceRecord = {
        id: row.id,
        staffId: row.staff_id || '',
        staffName: row.staff_name || '',
        date: row.date || new Date().toISOString().split('T')[0],
        clockIn: row.clock_in || null,
        clockOut: row.clock_out || null,
        note: row.notes || undefined,
      };
      return att as unknown as T;
    }

    case 'leave': {
      const l: LeaveRequest = {
        id: row.id,
        staffId: row.staff_id || '',
        staffName: row.staff_name || '',
        type: (row.leave_type || 'Casual') as LeaveType,
        fromDate: row.from_date || '',
        toDate: row.to_date || '',
        reason: row.reason || '',
        status: row.status || 'pending',
        requestedAt: row.created_at || new Date().toISOString(),
        decisionNote: row.decision_note || null,
        decidedBy: row.decided_by || null,
        decidedAt: row.decided_at || null,
      };
      return l as unknown as T;
    }

    case 'shifts': {
      const s: Shift = {
        id: row.id,
        staffId: row.clinic_id || 'all',
        staffName: row.name || 'Shift',
        days: (Array.isArray(row.days) ? row.days : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']) as DayOfWeek[],
        start: row.start_time || '09:00',
        end: row.end_time || '17:00',
        graceMinutes: 15,
      };
      return s as unknown as T;
    }

    case 'formulary': {
      const m: Medicine = {
        id: row.id,
        genericName: row.generic_name || '',
        brandNames: Array.isArray(row.brand_names) ? row.brand_names : [],
        drugClass: row.drug_class || 'other',
        form: row.form || 'Tablet',
        strengths: Array.isArray(row.strengths) ? row.strengths : [],
        defaultRoute: row.default_route || 'Oral',
        active: row.active ?? true,
      };
      return m as unknown as T;
    }

    case 'notifications': {
      const n: InAppNotification = {
        id: row.id,
        recipientId: row.recipient_id || '',
        title: row.title || '',
        message: row.message || '',
        type: row.type || 'general',
        read: Boolean(row.is_read),
        createdAt: row.created_at || new Date().toISOString(),
        linkTab: row.link_tab || undefined,
      };
      return n as unknown as T;
    }

    case 'accounts': {
      const acc: Account = {
        id: row.id,
        clinicId: row.clinic_id,
        username: row.username || '',
        email: row.email || '',
        fullName: row.full_name || '',
        phone: row.phone || '',
        role: row.role,
        passwordHash: row.password_hash || '',
        passwordSalt: row.password_salt || '',
        passwordIterations: Number(row.password_iterations) || 100000,
        status: row.status || 'active',
        rejectionReason: row.rejection_reason || undefined,
        claimPending: Boolean(row.claim_pending),
        linkedPatientId: row.linked_patient_id || undefined,
        failedLoginAttempts: Number(row.failed_login_attempts) || 0,
        lockedUntil: row.locked_until ? new Date(row.locked_until).getTime() : null,
        createdAt: row.created_at || new Date().toISOString(),
        updatedAt: row.updated_at || new Date().toISOString(),
      };
      return acc as unknown as T;
    }

    case 'staff': {
      const st: StaffAccessRecord = {
        id: row.id,
        role: row.role,
        staffName: row.name || '',
        staffTitle: row.title || '',
        department: row.department || '',
        badgeNumber: row.id,
        status: row.status === 'active' || row.status === 'on_leave' ? 'granted' : 'revoked',
        lastUpdated: row.updated_at || new Date().toISOString(),
        updatedBy: 'System',
        isOriginalAdmin: Boolean(row.is_original_admin),
      };
      return st as unknown as T;
    }

    case 'invoices': {
      const inv: Invoice = {
        id: row.id,
        number: row.invoice_number || row.id,
        patientId: row.patient_id || '',
        patientName: row.patient_name || '',
        doctorId: row.doctor_id || '',
        doctorName: row.doctor_name || '',
        issuedAt: row.invoice_date ? `${row.invoice_date}T00:00:00.000Z` : new Date().toISOString(),
        status: row.status === 'partially_paid' ? 'partially_paid' : row.status === 'paid' ? 'paid' : row.status === 'cancelled' ? 'void' : 'unpaid',
        items: [],
        createdBy: { id: 'system', name: 'Billing' },
      };
      return inv as unknown as T;
    }

    case 'payments': {
      const pay: Payment = {
        id: row.id,
        invoiceId: row.invoice_id || '',
        amount: Math.round(Number(row.amount) * 100) || 0, // In cents
        method: row.payment_method || 'cash',
        kind: 'payment',
        receivedAt: row.payment_date || new Date().toISOString(),
        receivedBy: row.recorded_by ? { id: 'staff', name: row.recorded_by } : { id: 'staff', name: 'Cashier' },
        receiptNumber: row.transaction_ref || `RCT-${row.id}`,
        note: row.notes || undefined,
      };
      return pay as unknown as T;
    }

    case 'assignments': {
      const asg: PatientAssignment = {
        id: row.id,
        patientId: row.patient_id || '',
        doctorId: row.doctor_id || '',
        doctorName: row.doctor_name || '',
        from: row.from_date || new Date().toISOString(),
        to: row.to_date || null,
        transferredBy: row.transferred_by || '',
        reason: row.reason || '',
      };
      return asg as unknown as T;
    }

    default:
      return row as T;
  }
}

/**
 * Converts an application domain model to a database snake_case row.
 */
export function toDatabaseRow(collection: CollectionName, item: any, clinicId = 'CLN-001'): Record<string, any> {
  const now = new Date().toISOString();

  switch (collection) {
    case 'patients': {
      const p = item as Patient;
      return {
        id: p.id,
        clinic_id: clinicId,
        mrn: p.mrn || '',
        first_name: p.firstName || '',
        last_name: p.lastName || '',
        gender: p.gender || 'other',
        dob: p.dob || '2000-01-01',
        age: p.age || 0,
        phone: p.phone || '',
        email: p.email || null,
        address: p.address || null,
        blood_group: p.bloodGroup || null,
        allergies: Array.isArray(p.allergies) ? p.allergies : [],
        chronic_conditions: Array.isArray(p.chronicConditions) ? p.chronicConditions : [],
        emergency_contact_name: p.emergencyContact?.name || null,
        emergency_contact_relationship: p.emergencyContact?.relationship || null,
        emergency_contact_phone: p.emergencyContact?.phone || null,
        status: p.status === 'inactive' ? 'inactive' : 'active',
        registered_date: p.registeredDate || now.split('T')[0],
        registered_by_id: p.registeredBy?.id || null,
        registered_by_name: p.registeredBy?.name || null,
        source: p.source || 'reception',
        last_visit_date: p.lastVisitDate || null,
        updated_at: now,
      };
    }

    case 'appointments': {
      const a = item as Appointment;
      return {
        id: a.id,
        clinic_id: clinicId,
        appointment_number: a.appointmentNumber || a.id,
        patient_id: a.patientId,
        patient_name: a.patientName,
        patient_phone: a.patientPhone || null,
        doctor_id: a.doctorId,
        doctor_name: a.doctorName,
        department: a.department || null,
        date_time: a.dateTime || now,
        duration_minutes: a.durationMinutes || 15,
        status: a.status || 'scheduled',
        reason_for_visit: a.reasonForVisit || null,
        chief_complaint: a.chiefComplaint || null,
        token_number: a.tokenNumber || 1,
        consultation_room: a.consultationRoom || null,
        source: a.source || 'reception',
        checked_in_at: a.checkedInAt || null,
        checked_in_by_id: a.checkedInBy?.id || null,
        checked_in_by_name: a.checkedInBy?.name || null,
        booked_by_id: a.bookedBy?.id || null,
        booked_by_name: a.bookedBy?.name || null,
        cancelled_at: a.cancelledAt || null,
        cancelled_by_id: a.cancelledBy?.id || null,
        cancelled_by_name: a.cancelledBy?.name || null,
        cancel_reason: a.cancelReason || null,
        notes: a.notes || null,
        updated_at: now,
      };
    }

    case 'visits': {
      const v = item as Visit;
      return {
        id: v.id,
        clinic_id: clinicId,
        patient_id: v.patientId,
        appointment_id: v.appointmentId || null,
        doctor_id: v.doctorId,
        visit_date: v.date || now.split('T')[0],
        reason: v.reason || null,
        notes: v.notes || null,
        systolic_bp: v.vitals?.systolicBp || null,
        diastolic_bp: v.vitals?.diastolicBp || null,
        heart_rate_bpm: v.vitals?.heartRateBpm || null,
        oxygen_saturation_pct: v.vitals?.oxygenSaturationPct || null,
        temperature_celsius: v.vitals?.temperatureCelsius || null,
        updated_at: now,
      };
    }

    case 'attendance': {
      const att = item as AttendanceRecord;
      return {
        id: att.id,
        clinic_id: clinicId,
        staff_id: att.staffId,
        staff_name: att.staffName || null,
        date: att.date || now.split('T')[0],
        clock_in: att.clockIn || null,
        clock_out: att.clockOut || null,
        notes: att.note || null,
        updated_at: now,
      };
    }

    case 'leave': {
      const l = item as LeaveRequest;
      return {
        id: l.id,
        clinic_id: clinicId,
        staff_id: l.staffId,
        staff_name: l.staffName || null,
        leave_type: l.type || 'Casual',
        from_date: l.fromDate,
        to_date: l.toDate,
        reason: l.reason || null,
        status: l.status || 'pending',
        decision_note: l.decisionNote || null,
        decided_by: l.decidedBy || null,
        decided_at: l.decidedAt || null,
        updated_at: now,
      };
    }

    case 'shifts': {
      const s = item as Shift;
      return {
        id: s.id,
        clinic_id: clinicId,
        name: s.staffName || 'Shift',
        start_time: s.start || '09:00',
        end_time: s.end || '17:00',
        days: Array.isArray(s.days) ? s.days : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        department: null,
        status: 'active',
      };
    }

    case 'formulary': {
      const m = item as Medicine;
      return {
        id: m.id,
        generic_name: m.genericName,
        brand_names: Array.isArray(m.brandNames) ? m.brandNames : [],
        drug_class: m.drugClass || 'other',
        form: m.form || 'Tablet',
        strengths: Array.isArray(m.strengths) ? m.strengths : [],
        default_route: m.defaultRoute || 'Oral',
        active: m.active ?? true,
      };
    }

    case 'notifications': {
      const n = item as InAppNotification;
      return {
        id: n.id,
        clinic_id: clinicId,
        recipient_id: n.recipientId,
        title: n.title,
        message: n.message,
        type: n.type || 'general',
        is_read: Boolean(n.read),
        link_tab: n.linkTab || null,
      };
    }

    case 'accounts': {
      const acc = item as Account;
      return {
        id: acc.id,
        clinic_id: acc.clinicId !== undefined ? acc.clinicId : clinicId,
        username: acc.username,
        email: acc.email,
        full_name: acc.fullName,
        phone: acc.phone || null,
        role: acc.role,
        password_hash: acc.passwordHash,
        password_salt: acc.passwordSalt,
        password_iterations: acc.passwordIterations || 100000,
        status: acc.status || 'active',
        rejection_reason: acc.rejectionReason || null,
        claim_pending: Boolean(acc.claimPending),
        linked_patient_id: acc.linkedPatientId || null,
        failed_login_attempts: acc.failedLoginAttempts || 0,
        locked_until: acc.lockedUntil ? new Date(acc.lockedUntil).toISOString() : null,
        updated_at: now,
      };
    }

    case 'staff': {
      const st = item as StaffAccessRecord;
      return {
        id: st.id,
        clinic_id: clinicId,
        name: st.staffName,
        title: st.staffTitle || null,
        department: st.department || null,
        role: st.role,
        status: st.status === 'granted' ? 'active' : 'inactive',
        is_original_admin: Boolean(st.isOriginalAdmin),
        updated_at: now,
      };
    }

    case 'invoices': {
      const inv = item as Invoice;
      const totalAmount = Array.isArray(inv.items)
        ? inv.items.reduce((sum, it) => sum + (it.amount || 0), 0) / 100
        : 0;

      return {
        id: inv.id,
        clinic_id: clinicId,
        invoice_number: inv.number || inv.id,
        patient_id: inv.patientId,
        patient_name: inv.patientName || null,
        doctor_id: inv.doctorId || null,
        doctor_name: inv.doctorName || null,
        invoice_date: inv.issuedAt ? inv.issuedAt.split('T')[0] : now.split('T')[0],
        total_amount: totalAmount,
        subtotal: totalAmount,
        status: inv.status === 'void' ? 'cancelled' : inv.status,
        updated_at: now,
      };
    }

    case 'payments': {
      const pay = item as Payment;
      return {
        id: pay.id,
        clinic_id: clinicId,
        invoice_id: pay.invoiceId,
        patient_id: 'unknown',
        amount: (pay.amount || 0) / 100, // In decimal currency
        payment_date: pay.receivedAt || now,
        payment_method: pay.method || 'cash',
        transaction_ref: pay.receiptNumber || null,
        recorded_by: typeof pay.receivedBy === 'string' ? pay.receivedBy : pay.receivedBy?.name || 'Cashier',
        notes: pay.note || null,
      };
    }

    case 'assignments': {
      const asg = item as PatientAssignment;
      return {
        id: asg.id,
        clinic_id: clinicId,
        patient_id: asg.patientId,
        doctor_id: asg.doctorId,
        doctor_name: asg.doctorName || null,
        from_date: asg.from || now,
        to_date: asg.to || null,
        transferred_by: asg.transferredBy || null,
        reason: asg.reason || null,
      };
    }

    default:
      return { id: item.id, ...item };
  }
}
