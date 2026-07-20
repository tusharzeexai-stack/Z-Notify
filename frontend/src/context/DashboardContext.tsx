import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'super-admin' | 'admin' | 'employee';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  age?: number;
  gender?: string;
  state?: string;
  district?: string;
  pincode?: string;
  education?: string;
  occupation?: string;
  income?: number;
  marital_status?: string;
  house_ownership?: string;
  caste_category?: string;
  disability_status?: string;
  mobile?: string;
}

export type ViewType =
  | 'stats'
  | 'compose'
  | 'review'
  | 'flagged'
  | 'history'
  | 'my-notifications'
  | 'received-approved'
  | 'approved-queue'
  | 'user-management'
  | 'settings'
  | 'user-search'
  | 'notification-generator'
  | 'eligibility-rules'
  | 'buckets'
  | 'delivery-center'
  | 'users'
  | 'schemes'
  | 'scheme-sync'
  | 'jobs'
  | 'services'
  | 'medical-facilities'
  | 'audit-logs'
  | 'analytics'
  | 'cohorts'
  | 'generated-notifications';

export interface NotificationItem {
  id: string;
  user_id: string;
  citizen_id?: string;
  title: string;
  description: string;
  raw_content?: string;
  personalized_content?: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  eligibility_score: number;
  reason_for_match?: string;
  source: string;
  status: string;
  generated_at: string;
  is_updated?: boolean;
  body?: string;
  notes?: string;
  audience?: string;
  channels?: string[];
  readBy?: string[];
  dismissedBy?: string[];
  submittedBy?: string;
  volume?: number;
  risk?: string;
  flagReason?: string;
  flaggedBy?: string;
  timestamp?: string;
}

export interface ReviewItem {
  id: string;
  notification_id: string;
  reviewer_id?: string;
  status: string;
  assigned_at: string;
  reviewed_at?: string;
  notification: NotificationItem;
  comments: any[];
}

export interface SchemeItem {
  id: string;
  title: string;
  description: string;
  agency: string;
  benefit_details?: string;
  eligibility_criteria?: any;
  scheme_name?: string;
  official_url?: string;
  application_url?: string;
  scheme_category?: string;
  benefit_amount?: string;
  state?: string;
  district?: string;
}

export interface JobItem {
  id: string;
  sl_no: string;
  job_type?: string;
  job_category?: string;
  job_subcategory?: string;
  education_qualification?: string;
  occupation?: string;
  job_role_position?: string;
  name_of_company_person?: string;
  salary_range?: string;
  state?: string;
  city?: string;
  district?: string;
  exp_required?: string;
  job_contact_number?: string;
  job_contact_email?: string;
  job_url?: string;
  mode_of_contact?: string;
  expiry_date?: string;
  user_id_ref?: string;
  status?: string;
  reason_for_rejection?: string;
}

export interface ServiceItem {
  id: string;
  title: string;
  description: string;
  department: string;
  eligibility_criteria: any;
}

export interface MedicalFacilityItem {
  id: string;
  name: string;
  type: string;
  location: string;
  services_offered: any;
}

export interface RuleWeights {
  id: string;
  state_weight: number;
  district_weight: number;
  income_weight: number;
  age_weight: number;
  occupation_weight: number;
  is_active: boolean;
}

export interface AuditLogItem {
  id: string;
  action: string;
  user_id?: string;
  details?: any;
  timestamp: string;
}

export interface DeliveryLogItem {
  id: string;
  notification_id: string;
  channel: string;
  status: string;
  retry_count: number;
  error_message?: string;
  sent_at?: string;
}

export type ThemeMode = 'dark' | 'light';

interface DashboardContextType {
  token: string | null;
  currentUser: User | null;
  activeView: ViewType;
  notifications: NotificationItem[];
  users: User[];
  reviews: ReviewItem[];
  schemes: SchemeItem[];
  jobs: JobItem[];
  services: ServiceItem[];
  medicalFacilities: MedicalFacilityItem[];
  rules: RuleWeights | null;
  auditLogs: AuditLogItem[];
  deliveryLogs: DeliveryLogItem[];
  theme: ThemeMode;
  stats: any;
  login: (email: string, role: string) => Promise<boolean>;
  logout: () => void;
  changeView: (view: ViewType) => void;
  toggleTheme: () => void;
  
  // APIs
  fetchNotifications: () => Promise<void>;
  fetchUsers: (search?: string, state?: string, district?: string) => Promise<void>;
  fetchReviews: () => Promise<void>;
  fetchRules: () => Promise<void>;
  fetchInventories: () => Promise<void>;
  fetchAnalytics: () => Promise<void>;
  fetchAuditLogs: () => Promise<void>;
  fetchDeliveryLogs: () => Promise<void>;
  fetchSavedGenerations: () => Promise<any[]>;
  saveDrafts: (userId: string) => Promise<boolean>;
  sendToReview: (userId: string) => Promise<boolean>;
  deleteSavedGenerations: (userId: string) => Promise<boolean>;
  
  generateNotifications: (targetUserId: string, geminiApiKey?: string, userScores?: any, userData?: any) => Promise<any>;
  approveNotification: (id: string, comment?: string, employeeId?: string) => Promise<boolean>;
  rejectNotification: (id: string, comment?: string) => Promise<boolean>;
  flagNotification: (id: string, comment?: string, riskLevel?: string) => Promise<boolean>;
  sendNotification: (id: string, channel: string) => Promise<boolean>;
  updateRules: (weights: Omit<RuleWeights, 'id' | 'is_active'>) => Promise<boolean>;
  
  createScheme: (item: any) => Promise<boolean>;
  createJob: (item: any) => Promise<boolean>;
  uploadJobsExcel: (file: File) => Promise<{added: number, skipped: number} | null>;
  createService: (item: any) => Promise<boolean>;
  createFacility: (item: any) => Promise<boolean>;
  updateUserProfile: (userId: string, data: any) => Promise<boolean>;
  
  createNotification: (item: any) => Promise<boolean>;
  discardNotification: (id: string) => Promise<boolean>;
  regenerateSingleNotification: (id: string) => Promise<boolean>;
  sendFlaggedToAdmin: (id: string) => Promise<boolean>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API_BASE = import.meta.env.VITE_API_URL || (isLocalhost ? 'http://localhost:8000/api' : '/api');

const DEFAULT_SCHEMES: SchemeItem[] = [
  {
    id: '4a861b4f-d1c6-4c2f-bfd4-76ff58fd2eb7',
    scheme_name: 'PM Kisan Samman Nidhi (PM-KISAN)',
    title: 'PM Kisan Samman Nidhi (PM-KISAN)',
    description: 'Provides direct income support of Rs 6,000 per year to landholding farmer families.',
    official_url: 'https://www.myscheme.gov.in/schemes/pm-kisan',
    application_url: 'https://www.myscheme.gov.in/schemes/pm-kisan',
    scheme_category: 'Agriculture & Farmer Welfare',
    agency: 'Ministry of Agriculture and Farmers Welfare',
    benefit_amount: 'Rs 6,000 per year',
    benefit_details: 'Direct cash transfer in 3 equal installments of Rs 2,000',
    state: 'Any',
    district: 'Any'
  },
  {
    id: 'f62f3c88-98fc-444a-ae93-d27cb11af068',
    scheme_name: 'PM Kisan Maan-Dhan Yojana (PM-KMY)',
    title: 'PM Kisan Maan-Dhan Yojana (PM-KMY)',
    description: 'Pension scheme for small and marginal farmers providing Rs 3,000 monthly pension.',
    official_url: 'https://www.myscheme.gov.in/schemes/pm-kmy',
    application_url: 'https://www.myscheme.gov.in/schemes/pm-kmy',
    scheme_category: 'Pension & Social Security',
    agency: 'Ministry of Agriculture and Farmers Welfare',
    benefit_amount: 'Rs 3,000 per month',
    benefit_details: 'Assured pension after reaching age 60',
    state: 'Any',
    district: 'Any'
  },
  {
    id: '1c17b03c-0f16-407a-9703-42a5a142a459',
    scheme_name: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
    title: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
    description: 'Financial support to farmers suffering crop loss/damage due to natural calamities.',
    official_url: 'https://www.myscheme.gov.in/schemes/pmfby',
    application_url: 'https://www.myscheme.gov.in/schemes/pmfby',
    scheme_category: 'Crop Insurance',
    agency: 'Ministry of Agriculture',
    benefit_amount: 'Comprehensive Crop Insurance',
    state: 'Any',
    district: 'Any'
  }
];

const DEFAULT_JOBS: JobItem[] = [
  {
    id: 'c1142dcf-9b31-4b9c-af7b-c3839b1c821f',
    sl_no: 'J-101',
    job_role_position: 'Carpenter',
    job_type: 'Full Time',
    job_category: 'Construction & Carpentry',
    name_of_company_person: 'Registered Contractor / Individual',
    salary_range: 'Rs 18,000 - 25,000 / month',
    district: 'Thane',
    state: 'Maharashtra',
    exp_required: '0-2 Years',
    job_url: 'https://www.ncs.gov.in/Pages/Search.aspx?searchText=Carpenter&location=Thane',
    status: 'Approved'
  },
  {
    id: '99762470-f4e3-4ced-9a13-73d2af768110',
    sl_no: 'J-102',
    job_role_position: 'Sap Functional Consultants',
    job_type: 'Full Time',
    job_category: 'IT & Software',
    name_of_company_person: 'Enterprise Tech Solutions',
    salary_range: 'Rs 45,000 - 75,000 / month',
    district: 'Thane',
    state: 'Maharashtra',
    exp_required: '2-5 Years',
    job_url: 'https://www.ncs.gov.in/Pages/Search.aspx?searchText=Sap&location=Thane',
    status: 'Approved'
  }
];

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('hpns_token'));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<ViewType>('stats');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [schemes, setSchemes] = useState<SchemeItem[]>(DEFAULT_SCHEMES);
  const [jobs, setJobs] = useState<JobItem[]>(DEFAULT_JOBS);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [medicalFacilities, setMedicalFacilities] = useState<MedicalFacilityItem[]>([]);
  const [rules, setRules] = useState<RuleWeights | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [deliveryLogs, setDeliveryLogs] = useState<DeliveryLogItem[]>([]);
  
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('hpns_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  const [stats, setStats] = useState<any>({
    total_users: 0,
    notifications_generated: 0,
    pending_reviews: 0,
    approved: 0,
    rejected: 0,
    flagged: 0,
    delivered: 0,
    daily_volume: [],
    approval_rate: 0.0,
    delivery_rate: 0.0,
    category_distribution: [],
    top_schemes: [],
    top_jobs: [],
    district_analytics: []
  });

  // Headers helper
  const getHeaders = () => {
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  // Sync theme to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('hpns_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Check login state on mount
  useEffect(() => {
    if (token) {
      fetchUserMe(token);
    }
  }, [token]);

  const fetchUserMe = async (authToken?: string) => {
    const activeToken = authToken || token;
    if (!activeToken) return;
    try {
      const res = await fetch(`${API_BASE}/users/me`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data);
        setActiveView(data.role === 'employee' ? 'my-notifications' : 'stats');
      } else {
        logout();
      }
    } catch {
      logout();
    }
  };

  const login = async (email: string, _role: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password' })
      });
      
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('hpns_token', data.access_token);
        setToken(data.access_token);
        
        const userObj: User = {
          id: data.email, 
          email: data.email,
          role: data.role as UserRole,
          name: data.name
        };
        setCurrentUser(userObj);
        
        // Fetch full profile directly with token to bypass batch update lag
        fetchUserMe(data.access_token);
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('hpns_token');
    setToken(null);
    setCurrentUser(null);
    setActiveView('stats');
  };

  const changeView = (view: ViewType) => {
    setActiveView(view);
  };

  // Data Fetching APIs
  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/notifications`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async (search = '', state = '', district = '') => {
    if (!token) return;
    try {
      let url = `${API_BASE}/users?`;
      if (search) url += `search=${search}&`;
      if (state) url += `state=${state}&`;
      if (district) url += `district=${district}&`;
      
      const res = await fetch(url, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReviews = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/review/queue`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setReviews(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRules = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/rules`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setRules(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchInventories = async () => {
    if (!token) return;
    try {
      const resS_local = await fetch(`${API_BASE}/schemes`, { headers: getHeaders() });
      const resS_sync = await fetch(`${API_BASE}/myscheme/schemes?size=5000`, { headers: getHeaders() });
      
      const resJ = await fetch(`${API_BASE}/jobs`, { headers: getHeaders() });
      const resV = await fetch(`${API_BASE}/services`, { headers: getHeaders() });
      const resF = await fetch(`${API_BASE}/medical-facilities`, { headers: getHeaders() });

      let mergedSchemes: any[] = [];
      if (resS_local.ok) {
        const sData = await resS_local.json();
        mergedSchemes = mergedSchemes.concat(Array.isArray(sData) ? sData : (sData.items || []));
      }
      if (resS_sync.ok) {
        const sDataSync = await resS_sync.json();
        mergedSchemes = mergedSchemes.concat(Array.isArray(sDataSync) ? sDataSync : (sDataSync.items || []));
      }
      setSchemes(mergedSchemes);

      if (resJ.ok) {
        const jData = await resJ.json();
        setJobs(Array.isArray(jData) ? jData : (jData.items || []));
      }
      if (resV.ok) setServices(await resV.json());
      if (resF.ok) setMedicalFacilities(await resF.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAnalytics = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/analytics`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAuditLogs = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/audit-logs`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDeliveryLogs = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/delivery/logs`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setDeliveryLogs(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSavedGenerations = async (): Promise<any[]> => {
    if (!token) return [];
    try {
      const res = await fetch(`${API_BASE}/notifications/saved_generations`, { headers: getHeaders() });
      if (res.ok) {
        return await res.json();
      }
      return [];
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  const saveDrafts = async (userId: string): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch(`${API_BASE}/notifications/save_drafts`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ user_id: userId })
      });
      return res.ok;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const sendToReview = async (userId: string): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch(`${API_BASE}/notifications/send_to_review`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ user_id: userId })
      });
      return res.ok;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const deleteSavedGenerations = async (userId: string): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch(`${API_BASE}/notifications/saved_generations/${userId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return res.ok;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // recommendation triggers
  const generateNotifications = async (targetUserId: string, geminiApiKey?: string, userScores?: any, userData?: any): Promise<any> => {
    if (!token) return false;
    try {
      const res = await fetch(`${API_BASE}/notifications/generate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ 
          user_id: targetUserId,
          gemini_api_key: geminiApiKey || null,
          scores: userScores,
          user_data: userData
        })
      });
      if (res.ok) {
        const data = await res.json();
        fetchNotifications();
        return data;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const approveNotification = async (id: string, comment = '', employeeId?: string): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch(`${API_BASE}/review/approve`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ notification_id: id, comment, employee_id: employeeId })
      });
      if (res.ok) {
        fetchReviews();
        fetchNotifications();
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const rejectNotification = async (id: string, comment = ''): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch(`${API_BASE}/review/reject`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ notification_id: id, comment })
      });
      if (res.ok) {
        fetchReviews();
        fetchNotifications();
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const flagNotification = async (id: string, comment = '', riskLevel = 'medium'): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch(`${API_BASE}/review/flag`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ notification_id: id, comment, risk_level: riskLevel })
      });
      if (res.ok) {
        fetchReviews();
        fetchNotifications();
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const sendNotification = async (id: string, channel: string): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch(`${API_BASE}/delivery/send`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ notification_id: id, channel })
      });
      if (res.ok) {
        fetchNotifications();
        fetchDeliveryLogs();
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const updateRules = async (weights: any): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch(`${API_BASE}/rules`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(weights)
      });
      if (res.ok) {
        fetchRules();
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // CRUD builders
  const createScheme = async (item: any): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch(`${API_BASE}/schemes`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(item)
      });
      if (res.ok) {
        fetchInventories();
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const createJob = async (item: any): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch(`${API_BASE}/jobs`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(item)
      });
      if (res.ok) {
        fetchInventories();
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const uploadJobsExcel = async (file: File): Promise<{added: number, skipped: number} | null> => {
    if (!token) return null;
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch(`${API_BASE}/jobs/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Note: don't set Content-Type for FormData, browser will set multipart/form-data boundary automatically
        },
        body: formData
      });
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const createService = async (item: any): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch(`${API_BASE}/services`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(item)
      });
      if (res.ok) {
        fetchInventories();
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const createFacility = async (item: any): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch(`${API_BASE}/medical-facilities`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(item)
      });
      if (res.ok) {
        fetchInventories();
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const updateUserProfile = async (userId: string, data: any): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch(`${API_BASE}/users/${userId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      if (res.ok) {
        fetchUsers();
        if (currentUser && currentUser.id === userId) {
          fetchUserMe();
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const createNotification = async (item: any): Promise<boolean> => {
    const mockId = Math.random().toString(36).substring(7);
    const newItem: NotificationItem = {
      id: mockId,
      user_id: 'all',
      title: item.title,
      description: item.body,
      body: item.body,
      category: 'composed',
      priority: item.priority,
      eligibility_score: 100,
      source: 'manual',
      status: item.status.toUpperCase(),
      generated_at: new Date().toISOString(),
      is_updated: false,
      notes: item.notes,
      audience: item.audience,
      channels: item.channels,
      submittedBy: item.submittedBy
    };
    setNotifications((prev) => [newItem, ...prev]);
    return true;
  };

  const discardNotification = async (id: string): Promise<boolean> => {
    if (token) {
      try {
        const res = await fetch(`${API_BASE}/notifications/${id}`, {
          method: 'DELETE',
          headers: getHeaders()
        });
        if (res.ok) {
          setNotifications((prev) => prev.filter((n) => n.id !== id));
          return true;
        }
      } catch (err) {
        console.error(err);
      }
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    return true;
  };

  const regenerateSingleNotification = async (id: string): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch(`${API_BASE}/notifications/${id}/regenerate`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (res.ok) {
        fetchNotifications();
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const sendFlaggedToAdmin = async (id: string): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch(`${API_BASE}/notifications/${id}/send-to-admin`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (res.ok) {
        fetchNotifications();
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };



  return (
    <DashboardContext.Provider
      value={{
        token,
        currentUser,
        activeView,
        notifications,
        users,
        reviews,
        schemes,
        jobs,
        services,
        medicalFacilities,
        rules,
        auditLogs,
        deliveryLogs,
        theme,
        stats,
        login,
        logout,
        changeView,
        toggleTheme,
        
        fetchNotifications,
        fetchUsers,
        fetchReviews,
        fetchRules,
        fetchInventories,
        fetchAnalytics,
        fetchAuditLogs,
        fetchDeliveryLogs,
        fetchSavedGenerations,
        saveDrafts,
        sendToReview,
        deleteSavedGenerations,
        
        generateNotifications,
        approveNotification,
        rejectNotification,
        flagNotification,
        sendNotification,
        updateRules,
        
        createScheme,
        createJob,
        uploadJobsExcel,
        createService,
        createFacility,
        updateUserProfile,
        
        createNotification,
        discardNotification,
        regenerateSingleNotification,
        sendFlaggedToAdmin
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
