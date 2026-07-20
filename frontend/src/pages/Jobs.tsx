import React, { useEffect, useRef } from 'react';
import { useDashboard } from '../context/DashboardContext';

export const Jobs: React.FC = () => {
  const { jobs, fetchInventories, uploadJobsExcel } = useDashboard();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = React.useState('');
  const [selectedJob, setSelectedJob] = React.useState<any>(null);

  useEffect(() => {
    fetchInventories();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setMsg('Uploading and processing Excel...');
    const result = await uploadJobsExcel(file);
    if (result) {
      setMsg(`Success! Added ${result.added} new jobs. Skipped ${result.skipped} existing/unapproved jobs.`);
      fetchInventories();
    } else {
      setMsg('Failed to process Excel file. Ensure it has "title" and "department" columns.');
    }
    setTimeout(() => setMsg(''), 6000);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-xl">
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-xs">
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Career Openings Directory</h1>
          <p className="font-body-md text-on-surface-variant">
            Manage system-wide vacancies and recruitment notifications.
          </p>
        </div>
        <div className="flex gap-md">
          <input 
            type="file" 
            accept=".xls,.xlsx" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-secondary text-on-secondary font-label-md px-lg py-sm rounded-lg hover:opacity-90 transition-all cursor-pointer flex items-center gap-xs"
          >
            Upload Excel
          </button>
        </div>
      </div>

      {msg && (
        <div className="bg-primary/20 border border-primary p-md rounded text-on-surface font-bold text-center">
          {msg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
        {jobs.map((j) => (
          <div key={j.id} className="bg-surface-container border border-outline-variant p-lg rounded-xl flex flex-col justify-between h-64 card-hover">
            <div>
              <div className="flex justify-between items-start">
                <h3 className="font-label-md text-on-surface font-bold line-clamp-1">{j.job_role_position || 'Unknown Role'}</h3>
                <span className="bg-secondary/20 text-secondary border border-secondary/30 px-xs py-0.5 text-[9px] font-bold rounded uppercase">
                  {j.job_type || 'VACANCY'}
                </span>
              </div>
              <p className="text-[11px] text-outline mt-xs font-semibold">{j.name_of_company_person || 'N/A Company'}</p>
              <p className="text-body-sm text-on-surface-variant line-clamp-3 mt-sm">
                <span className="font-bold text-on-surface">Category:</span> {j.job_category || 'N/A'}<br/>
                <span className="font-bold text-on-surface">Experience:</span> {j.exp_required || 'Fresher'}<br/>
                <span className="font-bold text-on-surface">Contact:</span> {j.job_contact_email || j.job_contact_number || 'N/A'}
              </p>
              <p className="text-[11px] text-tertiary mt-xs italic">{j.salary_range || 'Not Disclosed'} | {j.city || j.district || j.state || 'Any Location'}</p>
            </div>

            <div className="border-t border-outline-variant/50 pt-sm mt-md flex justify-between items-center">
              <span className="text-[10px] text-outline font-mono-code truncate mr-2">
                QUALIFICATIONS: {j.education_qualification ? j.education_qualification.replace(/[\[\]"]/g, '') : 'Any Graduate'}
              </span>
              <button
                onClick={() => setSelectedJob(j)}
                className="bg-primary/10 text-primary font-label-sm px-sm py-1 rounded hover:bg-primary hover:text-on-primary transition-all whitespace-nowrap"
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>


      {/* Modal for Detailed View */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface/80 backdrop-blur-sm">
          <div className="bg-surface-container border border-outline shadow-xl rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-lg border-b border-outline-variant flex justify-between items-start">
              <div>
                <h2 className="font-headline-md text-on-surface">{selectedJob.job_role_position || 'Job Details'}</h2>
                <p className="font-body-md text-on-surface-variant mt-1">{selectedJob.name_of_company_person || 'N/A'}</p>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-on-surface-variant hover:text-error bg-surface-container-high rounded-full w-8 h-8 flex items-center justify-center transition-colors"
                title="Close"
              >
                &times;
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-lg overflow-y-auto flex-1 space-y-md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                
                {/* Basic Info */}
                <div className="space-y-sm">
                  <h3 className="font-label-lg text-primary border-b border-outline-variant/30 pb-1">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-2 text-body-sm">
                    <span className="text-outline">Job Type:</span> <span className="text-on-surface font-medium">{selectedJob.job_type || 'N/A'}</span>
                    <span className="text-outline">Category:</span> <span className="text-on-surface font-medium">{selectedJob.job_category || 'N/A'}</span>
                    <span className="text-outline">Subcategory:</span> <span className="text-on-surface font-medium">{selectedJob.job_subcategory || 'N/A'}</span>
                    <span className="text-outline">Salary Range:</span> <span className="text-on-surface font-medium">{selectedJob.salary_range || 'Not Disclosed'}</span>
                    <span className="text-outline">Experience:</span> <span className="text-on-surface font-medium">{selectedJob.exp_required || 'N/A'}</span>
                    <span className="text-outline">Expiry Date:</span> <span className="text-on-surface font-medium">{selectedJob.expiry_date || 'N/A'}</span>
                  </div>
                </div>

                {/* Location & Contact */}
                <div className="space-y-sm">
                  <h3 className="font-label-lg text-primary border-b border-outline-variant/30 pb-1">Location & Contact</h3>
                  <div className="grid grid-cols-2 gap-2 text-body-sm">
                    <span className="text-outline">City:</span> <span className="text-on-surface font-medium">{selectedJob.city || 'N/A'}</span>
                    <span className="text-outline">District:</span> <span className="text-on-surface font-medium">{selectedJob.district || 'N/A'}</span>
                    <span className="text-outline">State:</span> <span className="text-on-surface font-medium">{selectedJob.state || 'N/A'}</span>
                    <span className="text-outline">Email:</span> <span className="text-on-surface font-medium">{selectedJob.job_contact_email || 'N/A'}</span>
                    <span className="text-outline">Phone:</span> <span className="text-on-surface font-medium">{selectedJob.job_contact_number || 'N/A'}</span>
                    <span className="text-outline">Contact Mode:</span> <span className="text-on-surface font-medium">{selectedJob.mode_of_contact || 'N/A'}</span>
                  </div>
                </div>

              </div>

              {/* Qualifications */}
              <div className="space-y-sm mt-md">
                <h3 className="font-label-lg text-primary border-b border-outline-variant/30 pb-1">Qualifications & Occupation</h3>
                <div className="bg-surface-container-high p-sm rounded text-body-sm space-y-2">
                  <p><strong className="text-on-surface">Education:</strong> {selectedJob.education_qualification || 'N/A'}</p>
                  <p><strong className="text-on-surface">Occupation:</strong> {selectedJob.occupation || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Modal Footer with Apply Link */}
            <div className="p-md border-t border-outline-variant bg-surface-container-high flex justify-end gap-sm rounded-b-2xl">
              <button
                onClick={() => setSelectedJob(null)}
                className="px-lg py-sm font-label-md text-on-surface hover:bg-surface-container transition-colors rounded-lg"
              >
                Close
              </button>
              
              {selectedJob.job_url && selectedJob.job_url.trim() !== '' && selectedJob.job_url !== 'nan' ? (
                <a
                  href={selectedJob.job_url.startsWith('http') ? selectedJob.job_url : `https://${selectedJob.job_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-primary text-on-primary font-label-md px-xl py-sm rounded-lg hover:opacity-90 transition-all shadow-sm"
                >
                  Apply Now
                </a>
              ) : (
                <button disabled className="bg-outline/20 text-outline font-label-md px-xl py-sm rounded-lg cursor-not-allowed">
                  No Apply Link Provided
                </button>
              )}
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
};
