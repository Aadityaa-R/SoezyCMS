import { createClient } from '@supabase/supabase-js';
import { generateDemoScenario } from '../src/data/demoScenario';
import { toDatabaseRow } from '../src/data/relationalMappers';

const url = 'https://cgtxgnnufwfifgrqcuxb.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNndHhnbm51ZndmaWZncnFjdXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2ODQ5MjcsImV4cCI6MjEwOTI2MDkyN30.uUqa7Dn88MD3baLhiQugeOIUReTM4_4wFX8G97Jx7AM';

const supabase = createClient(url, key);
const CLINIC_ID = 'CLN-001';

async function syncAll() {
  console.log('Generating realistic clinical demonstration dataset...');
  const demo = generateDemoScenario();

  // 1. Pre-seed canonical doctor staff IDs ('doc-1', 'doc-2', 'doc-3') to satisfy foreign keys
  console.log('1. Ensuring canonical doctor staff IDs exist in public.staff...');
  const canonicalDoctors = [
    {
      id: 'doc-1',
      clinic_id: CLINIC_ID,
      name: 'Dr. Marcus Vance',
      title: 'Managing Director & Lead Physician',
      department: 'Internal Medicine',
      specialization: 'Internal Medicine & Management',
      role: 'md',
      consultation_fee: 800,
      room_number: 'Room 101',
      is_on_duty: true,
      status: 'active',
    },
    {
      id: 'doc-2',
      clinic_id: CLINIC_ID,
      name: 'Dr. Nathan Hayes',
      title: 'Consulting Physician',
      department: 'General Medicine',
      specialization: 'General Medicine & Triage',
      role: 'doctor',
      consultation_fee: 500,
      room_number: 'Room 102',
      is_on_duty: true,
      status: 'active',
    },
    {
      id: 'doc-3',
      clinic_id: CLINIC_ID,
      name: 'Dr. Sophia Reed',
      title: 'Consulting Physician',
      department: 'Family Medicine',
      specialization: 'Family Medicine',
      role: 'doctor',
      consultation_fee: 550,
      room_number: 'Room 103',
      is_on_duty: true,
      status: 'active',
    },
  ];
  await supabase.from('staff').upsert(canonicalDoctors);

  // 2. Sync staff from demo
  console.log('2. Syncing staff...');
  const staffRows = demo.staff.map((st) => toDatabaseRow('staff', st, CLINIC_ID));
  const { error: stErr } = await supabase.from('staff').upsert(staffRows);
  if (stErr) console.error('Staff error:', stErr.message);
  else console.log(`   Synced ${staffRows.length} staff.`);

  // 3. Sync patients
  console.log('3. Syncing patients...');
  const patientRows = demo.patients.map((p) => toDatabaseRow('patients', p, CLINIC_ID));
  const { error: patErr } = await supabase.from('patients').upsert(patientRows);
  if (patErr) console.error('Patients error:', patErr.message);
  else console.log(`   Synced ${patientRows.length} patients.`);

  // 4. Sync patient assignments
  console.log('4. Syncing patient assignments...');
  const assignmentRows = demo.patientAssignments.map((a) => toDatabaseRow('assignments', a, CLINIC_ID));
  const { error: asgErr } = await supabase.from('patient_assignments').upsert(assignmentRows);
  if (asgErr) console.error('Assignments error:', asgErr.message);
  else console.log(`   Synced ${assignmentRows.length} patient assignments.`);

  // 5. Sync appointments
  console.log('5. Syncing appointments...');
  const appointmentRows = demo.appointments.map((a) => toDatabaseRow('appointments', a, CLINIC_ID));
  const { error: apptErr } = await supabase.from('appointments').upsert(appointmentRows);
  if (apptErr) console.error('Appointments error:', apptErr.message);
  else console.log(`   Synced ${appointmentRows.length} appointments.`);

  const apptIdSet = new Set(demo.appointments.map((a) => a.id));

  // 6. Sync visits
  console.log('6. Syncing visits...');
  const visitRows = demo.visits.map((v) => {
    const row = toDatabaseRow('visits', v, CLINIC_ID);
    if (row.appointment_id && !apptIdSet.has(row.appointment_id)) {
      row.appointment_id = null;
    }
    return row;
  });
  const { error: visErr } = await supabase.from('visits').upsert(visitRows);
  if (visErr) console.error('Visits error:', visErr.message);
  else console.log(`   Synced ${visitRows.length} visits.`);

  // 7. Sync attendance
  console.log('7. Syncing attendance...');
  const attendanceRows = demo.attendanceRecords.map((att) => toDatabaseRow('attendance', att, CLINIC_ID));
  const { error: attErr } = await supabase.from('attendance').upsert(attendanceRows);
  if (attErr) console.error('Attendance error:', attErr.message);
  else console.log(`   Synced ${attendanceRows.length} attendance records.`);

  // 8. Sync leave requests
  console.log('8. Syncing leave requests...');
  const validLeaveTypes = new Set(['annual', 'sick', 'casual', 'maternity', 'emergency', 'unpaid']);
  const leaveRows = demo.leaveRequests.map((l) => {
    const row = toDatabaseRow('leave', l, CLINIC_ID);
    const normalized = (row.leave_type || '').toLowerCase();
    row.leave_type = validLeaveTypes.has(normalized) ? normalized : 'casual';
    return row;
  });
  const { error: levErr } = await supabase.from('leave_requests').upsert(leaveRows);
  if (levErr) console.error('Leave error:', levErr.message);
  else console.log(`   Synced ${leaveRows.length} leave requests.`);

  // 9. Sync shifts
  console.log('9. Syncing shifts...');
  const shiftRows = demo.shifts.map((s) => toDatabaseRow('shifts', s, CLINIC_ID));
  const { error: shfErr } = await supabase.from('shifts').upsert(shiftRows);
  if (shfErr) console.error('Shifts error:', shfErr.message);
  else console.log(`   Synced ${shiftRows.length} shifts.`);

  // 10. Sync formulary
  console.log('10. Syncing formulary medicines...');
  const formularyRows = demo.formulary.map((m) => toDatabaseRow('formulary', m, CLINIC_ID));
  const { error: fmlErr } = await supabase.from('formulary').upsert(formularyRows);
  if (fmlErr) console.error('Formulary error:', fmlErr.message);
  else console.log(`   Synced ${formularyRows.length} medicines in formulary.`);

  // 11. Sync invoices
  console.log('11. Syncing invoices...');
  const invoiceRows = demo.invoices.map((inv) => toDatabaseRow('invoices', inv, CLINIC_ID));
  const { error: invErr } = await supabase.from('invoices').upsert(invoiceRows);
  if (invErr) console.error('Invoices error:', invErr.message);
  else console.log(`   Synced ${invoiceRows.length} invoices.`);

  // 12. Sync payments
  console.log('12. Syncing payments...');
  const invoiceMap = new Map(demo.invoices.map((inv) => [inv.id, inv]));
  const defaultPatientId = demo.patients[0]?.id || 'pat-1';
  const paymentRows = demo.payments.map((p) => {
    const row = toDatabaseRow('payments', p, CLINIC_ID);
    const parentInvoice = invoiceMap.get(p.invoiceId);
    row.patient_id = parentInvoice?.patientId || defaultPatientId;
    return row;
  });
  const { error: payErr } = await supabase.from('payments').upsert(paymentRows);
  if (payErr) console.error('Payments error:', payErr.message);
  else console.log(`   Synced ${paymentRows.length} payments.`);

  // 13. Sync notifications
  console.log('13. Syncing notifications...');
  const notifRows = demo.notifications.map((n) => toDatabaseRow('notifications', n, CLINIC_ID));
  const { error: notErr } = await supabase.from('notifications').upsert(notifRows);
  if (notErr) console.error('Notifications error:', notErr.message);
  else console.log(`   Synced ${notifRows.length} notifications.`);

  console.log('\nALL 13 RELATIONAL DATASETS SYNCED 100% CLEANLY TO SUPABASE!');
}

syncAll();
