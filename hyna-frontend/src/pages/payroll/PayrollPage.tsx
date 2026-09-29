import { useState } from 'react';
import {
  CreditCard,
  Download,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  FileText,
  Search,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  Building,
  Calendar,
} from 'lucide-react';
import { Button, Badge, Modal, Input, Select } from '@/components/ui';
import { useAuthStore } from '@/stores';
import { toast } from 'sonner';
interface PayrollRecord {
  id: string;
  employeeId: string;
  name: string;
  role: string;
  department: string;
  baseSalary: number;
  bonus: number;
  deductions: number;
  netSalary: number;
  payDate: string;
  status: 'Paid' | 'Processing' | 'Pending';
  bankAccount: string;
}

const mockPayroll: PayrollRecord[] = [
  {
    id: 'pay-001',
    employeeId: 'EMP-001',
    name: 'Vignesh',
    role: 'CEO & Founder',
    department: 'Executive',
    baseSalary: 185000,
    bonus: 25000,
    deductions: 18000,
    netSalary: 192000,
    payDate: '2026-09-30',
    status: 'Paid',
    bankAccount: '•••• 4892',
  },
  {
    id: 'pay-002',
    employeeId: 'EMP-002',
    name: 'Jashwin',
    role: 'Chief Operating Officer',
    department: 'Executive',
    baseSalary: 160000,
    bonus: 18000,
    deductions: 15000,
    netSalary: 163000,
    payDate: '2026-09-30',
    status: 'Paid',
    bankAccount: '•••• 3190',
  },
  {
    id: 'pay-003',
    employeeId: 'EMP-003',
    name: 'Dharshan',
    role: 'Executive Admin',
    department: 'Executive',
    baseSalary: 140000,
    bonus: 12000,
    deductions: 13000,
    netSalary: 139000,
    payDate: '2026-09-30',
    status: 'Paid',
    bankAccount: '•••• 7183',
  },
  {
    id: 'pay-004',
    employeeId: 'EMP-004',
    name: 'Asthamil',
    role: 'Engineering Manager',
    department: 'Engineering',
    baseSalary: 135000,
    bonus: 15000,
    deductions: 12000,
    netSalary: 138000,
    payDate: '2026-09-30',
    status: 'Processing',
    bankAccount: '•••• 9024',
  },
  {
    id: 'pay-005',
    employeeId: 'EMP-005',
    name: 'Alexander Wright',
    role: 'Senior Full Stack Lead',
    department: 'Engineering',
    baseSalary: 120000,
    bonus: 10000,
    deductions: 11000,
    netSalary: 119000,
    payDate: '2026-09-30',
    status: 'Processing',
    bankAccount: '•••• 1156',
  },
  {
    id: 'pay-006',
    employeeId: 'EMP-006',
    name: 'Sophia Patel',
    role: 'Lead UI/UX Designer',
    department: 'Design',
    baseSalary: 105000,
    bonus: 8000,
    deductions: 9500,
    netSalary: 103500,
    payDate: '2026-09-30',
    status: 'Pending',
    bankAccount: '•••• 6421',
  },
];

export function PayrollPage() {
  const { effectiveRole } = useAuthStore();
  const isAdminOrManager = effectiveRole === 'admin' || effectiveRole === 'manager';

  const [records, setRecords] = useState<PayrollRecord[]>(mockPayroll);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
  const [showRunPayrollModal, setShowRunPayrollModal] = useState(false);

  const filteredRecords = records.filter((rec) => {
    const matchesSearch =
      rec.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = departmentFilter === 'All' || rec.department === departmentFilter;
    const matchesStatus = statusFilter === 'All' || rec.status === statusFilter;
    return matchesSearch && matchesDept && matchesStatus;
  });

  const totalPayroll = records.reduce((acc, curr) => acc + curr.netSalary, 0);
  const disbursedAmount = records
    .filter((r) => r.status === 'Paid')
    .reduce((acc, curr) => acc + curr.netSalary, 0);
  const pendingAmount = records
    .filter((r) => r.status !== 'Paid')
    .reduce((acc, curr) => acc + curr.netSalary, 0);

  const handleDownloadPayslip = (record: PayrollRecord) => {
    toast.success(`Payslip downloaded for ${record.name} (${record.employeeId})`);
  };

  const handleDisburseAll = () => {
    setRecords((prev) => prev.map((r) => ({ ...r, status: 'Paid' })));
    setShowRunPayrollModal(false);
    toast.success('September 2026 Payroll successfully disbursed to all accounts!');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)] flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              <CreditCard className="w-6 h-6" />
            </div>
            Payroll & Compensation
          </h1>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
            Automated salary disbursals, tax compliance, benefits, and payslip distribution.
          </p>
        </div>

        {isAdminOrManager && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info('Exporting monthly payroll summary report (CSV)...')}
            >
              <Download className="w-4 h-4 mr-1.5" />
              Export CSV
            </Button>
            <Button
              size="sm"
              onClick={() => setShowRunPayrollModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Process Payroll
            </Button>
          </div>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-[var(--color-muted-foreground)] mb-2">
            <span>Total Monthly Payroll</span>
            <DollarSign className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-[var(--color-foreground)]">
            ${totalPayroll.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-500 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+3.4% from last cycle</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-[var(--color-muted-foreground)] mb-2">
            <span>Disbursed (Settled)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-500">
            ${disbursedAmount.toLocaleString()}
          </div>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-2">
            Direct deposit via Automated Clearing House (ACH)
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-[var(--color-muted-foreground)] mb-2">
            <span>Pending Approvals</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-500">
            ${pendingAmount.toLocaleString()}
          </div>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-2">
            {records.filter((r) => r.status !== 'Paid').length} payouts awaiting final approval
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-[var(--color-muted-foreground)] mb-2">
            <span>Compliance & Tax</span>
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-[var(--color-foreground)]">100% Verified</div>
          <p className="text-xs text-emerald-500 font-medium mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            W-2 & 1099 compliant
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
          <Input
            placeholder="Search by employee name, role, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9.5 text-xs bg-[var(--color-background)]"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="h-9.5 px-3 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] font-medium outline-hidden"
          >
            <option value="All">All Departments</option>
            <option value="Executive">Executive</option>
            <option value="Engineering">Engineering</option>
            <option value="Design">Design</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9.5 px-3 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] font-medium outline-hidden"
          >
            <option value="All">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Processing">Processing</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/50 text-[var(--color-muted-foreground)] uppercase font-semibold tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Department & Role</th>
                <th className="py-3.5 px-4">Base Salary</th>
                <th className="py-3.5 px-4">Bonus</th>
                <th className="py-3.5 px-4">Deductions</th>
                <th className="py-3.5 px-4 font-bold text-[var(--color-foreground)]">Net Pay</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filteredRecords.map((record) => (
                <tr
                  key={record.id}
                  className="hover:bg-[var(--color-muted)]/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedRecord(record)}
                >
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-semibold flex items-center justify-center text-xs shrink-0">
                        {record.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-[var(--color-foreground)]">
                          {record.name}
                        </div>
                        <div className="text-[10px] text-[var(--color-muted-foreground)] font-mono">
                          {record.employeeId}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-[var(--color-foreground)]">{record.role}</div>
                    <div className="text-[10px] text-[var(--color-muted-foreground)]">
                      {record.department}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-[var(--color-foreground)]">
                    ${record.baseSalary.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-emerald-500 font-medium">
                    +${record.bonus.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-red-400 font-medium">
                    -${record.deductions.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-sm text-[var(--color-foreground)]">
                    ${record.netSalary.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${record.status === 'Paid'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : record.status === 'Processing'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                        }`}
                    >
                      {record.status === 'Paid' && <CheckCircle2 className="w-3 h-3" />}
                      {record.status === 'Processing' && <Clock className="w-3 h-3" />}
                      {record.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadPayslip(record);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-indigo-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                      title="Download Payslip PDF"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Payslip</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payslip Detail Modal */}
      {selectedRecord && (
        <Modal
          isOpen={!!selectedRecord}
          onClose={() => setSelectedRecord(null)}
          title={`Payslip Statement: ${selectedRecord.name}`}
        >
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--color-muted)]">
              <div>
                <p className="text-xs text-[var(--color-muted-foreground)]">Disbursal Target</p>
                <p className="text-sm font-semibold">{selectedRecord.bankAccount} (Direct Deposit)</p>
              </div>
              <Badge variant="outline">{selectedRecord.status}</Badge>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-[var(--color-border)]">
                <span className="text-[var(--color-muted-foreground)]">Employee ID</span>
                <span className="font-mono font-medium">{selectedRecord.employeeId}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[var(--color-border)]">
                <span className="text-[var(--color-muted-foreground)]">Base Gross Salary</span>
                <span className="font-semibold">${selectedRecord.baseSalary.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[var(--color-border)]">
                <span className="text-[var(--color-muted-foreground)]">Performance & Project Bonus</span>
                <span className="font-semibold text-emerald-500">+${selectedRecord.bonus.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[var(--color-border)]">
                <span className="text-[var(--color-muted-foreground)]">Standard Tax & Social Security</span>
                <span className="font-semibold text-red-400">-${selectedRecord.deductions.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-2 text-sm font-bold">
                <span>Net Credited Amount</span>
                <span className="text-indigo-500">${selectedRecord.netSalary.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" size="sm" onClick={() => setSelectedRecord(null)}>
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  handleDownloadPayslip(selectedRecord);
                  setSelectedRecord(null);
                }}
              >
                <Download className="w-4 h-4 mr-1.5" />
                Download PDF
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Process Payroll Modal */}
      {showRunPayrollModal && (
        <Modal
          isOpen={showRunPayrollModal}
          onClose={() => setShowRunPayrollModal(false)}
          title="Confirm Payroll Disbursal"
        >
          <div className="space-y-4 pt-2">
            <p className="text-xs text-[var(--color-muted-foreground)] leading-relaxed">
              You are about to initiate Automated Clearing House (ACH) direct deposit transfers for{' '}
              <strong>{records.length} team members</strong> totaling{' '}
              <strong>${totalPayroll.toLocaleString()}</strong>.
            </p>
            <div className="p-3.5 rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-xs text-indigo-400 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Database RLS and Signature Validated
              </p>
              <p className="text-[11px] opacity-90">
                PostgreSQL audit logs will record this transaction under your executive administrative authority.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-3">
              <Button variant="outline" size="sm" onClick={() => setShowRunPayrollModal(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleDisburseAll} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Authorize & Disburse All
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default PayrollPage;
