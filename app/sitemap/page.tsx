"use client";

import { useEffect, useRef } from "react";

export default function SitemapPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function ensureMermaid(): Promise<any> {
      return new Promise((resolve) => {
        if (typeof window !== "undefined" && (window as any).mermaid) {
          resolve((window as any).mermaid);
          return;
        }
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
        script.async = true;
        script.onload = () => resolve((window as any).mermaid);
        document.body.appendChild(script);
      });
    }

    ensureMermaid().then((mermaid: any) => {
      mermaid.initialize({ startOnLoad: false, theme: "default" });
      const target = containerRef.current;
      if (!target) return;
      const code = target.querySelector("code");
      if (!code) return;
      const graphDefinition = code.textContent || "";
      const renderId = `mermaid-${Math.random().toString(36).slice(2)}`;
      mermaid.render(renderId, graphDefinition).then((res: any) => {
        target.innerHTML = res.svg;
      });
    });
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16 }}>
        Attendance Management System — Visual Sitemap
      </h1>
      <div ref={containerRef}>
        <pre style={{ whiteSpace: "pre-wrap" }}>
          <code>
{`flowchart TD
  %% Project Title
  title["Attendance Management System (Web)"]

  %% Authentication (Common)
  subgraph AUTH["🔒 Authentication (Common)"]
    A_Login[Login]
    A_Forgot[Forgot Password]
    A_Reset[Reset Password]
    A_ProfileSetup[Profile Setup (first-time login)]
  end

  %% Role-based Redirect
  A_Login --> RB{Role-based Redirect}
  RB -->|Admin| AD_Dashboard
  RB -->|Employee| EM_Dashboard

  %% Admin Module
  subgraph ADMIN["👨‍💼 Admin Module"]
    subgraph AD_DASH[Dashboard]
      AD_Dashboard[Admin Dashboard]
      AD_TotalEmployees[Total Employees]
      AD_AttendanceSummary[Attendance Summary (Present, Absent, Late)]
      AD_AvgHours[Average Hours]
      AD_ActiveEmployees[Active Employees]
      AD_UpcomingHolidays[Upcoming Holidays]
    end

    subgraph AD_EMP_MGMT[Employee Management]
      AD_Emp_List[View Profiles]
      AD_Emp_Add[Add Employee]
      AD_Emp_Edit[Edit Employee]
      AD_Emp_Delete[Delete Employee]
      AD_Emp_Assign[Assign Department / Manager]
      AD_Emp_Import[Import from CSV]
    end

    subgraph AD_ATT_MGMT[Attendance Management]
      AD_Att_All[View All Attendance]
      AD_Att_Manual[Manual Marking / Correction]
      AD_Att_Logs[Check-in / Check-out Logs]
      AD_Att_Overtime[Overtime & Late Hours Tracking]
    end

    subgraph AD_TIMESHEETS[Timesheets]
      AD_Timesheets_View[View Timesheets]
      AD_Timesheets_Approve[Approve Timesheets]
      AD_Timesheets_Edit[Edit Timesheets]
      AD_Timesheets_Export[Export as PDF/Excel]
      AD_Timesheets_Filter[Filter by Department, Date, Employee]
    end

    subgraph AD_LEAVE[Leave Management]
      AD_Leave_Approve[Approve Leave Requests]
      AD_Leave_Reject[Reject Leave Requests]
      AD_Leave_Types[Configure Leave Types]
      AD_Leave_History[View Leave History per Employee]
    end

    subgraph AD_PAYROLL[Payslips / Payroll]
      AD_Pay_Gen[Generate Payslips]
      AD_Pay_Set[Set Basic, Allowances, Deductions]
      AD_Pay_Export[Export Payslip (PDF)]
    end

    subgraph AD_HOLIDAYS[Holidays]
      AD_Holiday_Add[Add Holiday]
      AD_Holiday_Edit[Edit Holiday]
      AD_Holiday_Delete[Delete Holiday]
      AD_Holiday_Display[Display on Employee Dashboard]
    end

    subgraph AD_REPORTS[Reports]
      AD_Report_Att[Attendance Report]
      AD_Report_Leave[Leave Report]
      AD_Report_Payroll[Payroll Report]
      AD_Report_Export[Download / Export Options]
    end

    subgraph AD_SETTINGS[Settings]
      AD_Set_Shift[Shift Timing Rules]
      AD_Set_Late[Late Mark Rules]
      AD_Set_Notify[Notification / Email Settings]
    end
  end

  %% Employee Module
  subgraph EMPLOYEE["👷 Employee Module"]
    subgraph EM_DASH[Dashboard]
      EM_Dashboard[Employee Dashboard]
      EM_DailyStatus[Daily Attendance Status]
      EM_QuickIO[Quick Check-In / Check-Out]
      EM_WorkingSummary[Working Days & Leaves Summary]
      EM_UpcomingHolidays[Upcoming Holidays]
    end

    subgraph EM_MARK[Mark Attendance]
      EM_CheckInOut[Check-In / Check-Out Button]
      EM_GPS[GPS & Time Capture]
      EM_DailyHours[Daily Work Hours View]
    end

    subgraph EM_HISTORY[Attendance History]
      EM_Calendar[Calendar View (Present/Absent/Late)]
      EM_MonthlyReport[Download Monthly Report]
    end

    subgraph EM_TIMESHEET[Timesheet]
      EM_Logs[Daily Logs (Time In/Out)]
      EM_SubmitManual[Submit Manual Entry (if allowed)]
      EM_Timesheet_Export[Export Timesheet]
    end

    subgraph EM_LEAVE[Leave Management]
      EM_Apply[Apply for Leave (Type, Reason, Range)]
      EM_Track[Track Leave Status]
      EM_Balance[Leave Balance Summary]
    end

    subgraph EM_PAYSLIPS[Payslips]
      EM_ViewPayslips[View & Download Payslips (PDF)]
      EM_SalaryBreakdown[Salary Breakdown]
    end

    subgraph EM_PROFILE[Profile]
      EM_EditInfo[Edit Personal Info]
      EM_ViewManager[View Assigned Manager / Department]
      EM_ChangePassword[Change Password]
      EM_UploadAvatar[Upload Profile Picture]
    end
  end

  %% Shared Reports
  subgraph SHARED_REPORTS["📊 Reports (Shared)"]
    SR_AttSummary[Attendance Summary]
    SR_TimesheetSummary[Timesheet Summary]
    SR_LeaveReport[Leave Report]
    SR_PayrollReport[Payroll Report (Admin only)]
  end

  %% Optional Enhancements
  subgraph OPTIONAL["⚙️ Optional Enhancements"]
    OPT_GPS[GPS / Geo-tag Attendance]
    OPT_Selfie[Selfie Capture for Verification]
    OPT_Notify[Notifications for Leave, Payslip, Attendance]
    OPT_QR[QR Code Check-In System]
  end

  %% Authentication flows
  A_Forgot --> A_Reset
  A_ProfileSetup --> RB

  %% Admin navigation
  AD_Dashboard --> AD_EMP_MGMT
  AD_Dashboard --> AD_ATT_MGMT
  AD_Dashboard --> AD_TIMESHEETS
  AD_Dashboard --> AD_LEAVE
  AD_Dashboard --> AD_PAYROLL
  AD_Dashboard --> AD_HOLIDAYS
  AD_Dashboard --> AD_REPORTS
  AD_Dashboard --> AD_SETTINGS

  AD_EMP_MGMT --> AD_Emp_List
  AD_Emp_List --> AD_Emp_Add
  AD_Emp_List --> AD_Emp_Edit
  AD_Emp_List --> AD_Emp_Delete
  AD_Emp_List --> AD_Emp_Assign
  AD_Emp_List --> AD_Emp_Import

  AD_ATT_MGMT --> AD_Att_All
  AD_Att_All --> AD_Att_Manual
  AD_Att_All --> AD_Att_Logs
  AD_Att_All --> AD_Att_Overtime

  AD_TIMESHEETS --> AD_Timesheets_View
  AD_Timesheets_View --> AD_Timesheets_Approve
  AD_Timesheets_View --> AD_Timesheets_Edit
  AD_Timesheets_View --> AD_Timesheets_Export
  AD_Timesheets_View --> AD_Timesheets_Filter

  AD_LEAVE --> AD_Leave_Approve
  AD_LEAVE --> AD_Leave_Reject
  AD_LEAVE --> AD_Leave_Types
  AD_LEAVE --> AD_Leave_History

  AD_PAYROLL --> AD_Pay_Gen
  AD_PAYROLL --> AD_Pay_Set
  AD_PAYROLL --> AD_Pay_Export

  AD_HOLIDAYS --> AD_Holiday_Add
  AD_HOLIDAYS --> AD_Holiday_Edit
  AD_HOLIDAYS --> AD_Holiday_Delete
  AD_HOLIDAYS --> AD_Holiday_Display

  AD_REPORTS --> AD_Report_Att
  AD_REPORTS --> AD_Report_Leave
  AD_REPORTS --> AD_Report_Payroll
  AD_REPORTS --> AD_Report_Export

  AD_SETTINGS --> AD_Set_Shift
  AD_SETTINGS --> AD_Set_Late
  AD_SETTINGS --> AD_Set_Notify

  %% Employee navigation
  EM_Dashboard --> EM_MARK
  EM_Dashboard --> EM_HISTORY
  EM_Dashboard --> EM_TIMESHEET
  EM_Dashboard --> EM_LEAVE
  EM_Dashboard --> EM_PAYSLIPS
  EM_Dashboard --> EM_PROFILE

  EM_MARK --> EM_CheckInOut
  EM_MARK --> EM_GPS
  EM_MARK --> EM_DailyHours

  EM_HISTORY --> EM_Calendar
  EM_HISTORY --> EM_MonthlyReport

  EM_TIMESHEET --> EM_Logs
  EM_TIMESHEET --> EM_SubmitManual
  EM_TIMESHEET --> EM_Timesheet_Export

  EM_LEAVE --> EM_Apply
  EM_LEAVE --> EM_Track
  EM_LEAVE --> EM_Balance

  EM_PAYSLIPS --> EM_ViewPayslips
  EM_PAYSLIPS --> EM_SalaryBreakdown

  EM_PROFILE --> EM_EditInfo
  EM_PROFILE --> EM_ViewManager
  EM_PROFILE --> EM_ChangePassword
  EM_PROFILE --> EM_UploadAvatar

  %% Shared reports access
  AD_Report_Att --> SR_AttSummary
  AD_Report_Leave --> SR_LeaveReport
  AD_Report_Payroll --> SR_PayrollReport
  AD_Timesheets_View --> SR_TimesheetSummary

  EM_HISTORY --> SR_AttSummary
  EM_TIMESHEET --> SR_TimesheetSummary
  EM_LEAVE --> SR_LeaveReport

  %% Optional enhancements links
  EM_GPS --> OPT_GPS
  EM_CheckInOut --> OPT_QR
  A_Login --> OPT_Notify
  EM_UploadAvatar --> OPT_Selfie
`}
          </code>
        </pre>
      </div>
    </div>
  );
}




