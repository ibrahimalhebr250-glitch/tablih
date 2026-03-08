import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface DatabaseBackup {
  id: string;
  backup_date: string;
  backup_type: 'manual' | 'automatic_daily' | 'automatic_weekly';
  table_count: number;
  backup_size_mb: number;
  backup_status: 'completed' | 'in_progress' | 'failed';
  created_by: string | null;
}

export interface BackupSchedule {
  id: string;
  schedule_type: 'daily' | 'weekly' | 'monthly';
  schedule_time: string;
  is_active: boolean;
  last_run: string | null;
  next_run: string | null;
}

export interface RestorationLog {
  id: string;
  backup_id: string;
  restored_by: string;
  restoration_date: string;
  restoration_status: 'completed' | 'in_progress' | 'failed';
  tables_restored: any;
  restoration_notes: string | null;
}

export interface BackupStatistics {
  total_backups: number;
  total_size_mb: number;
  latest_backup: string | null;
  automatic_backups: number;
  manual_backups: number;
  failed_backups: number;
}

export function useBackupSystem(adminEmail: string) {
  const [backups, setBackups] = useState<DatabaseBackup[]>([]);
  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
  const [restorationLogs, setRestorationLogs] = useState<RestorationLog[]>([]);
  const [statistics, setStatistics] = useState<BackupStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBackups = async () => {
    try {
      const { data, error: err } = await supabase.rpc('admin_list_backups');
      if (err) throw err;
      setBackups(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تحميل النسخ الاحتياطية');
    }
  };

  const fetchSchedules = async () => {
    try {
      const { data, error: err } = await supabase.rpc('admin_get_backup_schedules');
      if (err) throw err;
      setSchedules(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تحميل جداول النسخ الاحتياطي');
    }
  };

  const fetchRestorationLogs = async () => {
    try {
      const { data, error: err } = await supabase.rpc('admin_get_restoration_logs', { p_limit: 50 });
      if (err) throw err;
      setRestorationLogs(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تحميل سجلات الاستعادة');
    }
  };

  const fetchStatistics = async () => {
    try {
      const { data, error: err } = await supabase.rpc('admin_get_backup_statistics');
      if (err) throw err;
      setStatistics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تحميل الإحصائيات');
    }
  };

  const createBackup = async (backupType: 'manual' | 'automatic_daily' | 'automatic_weekly' = 'manual') => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase.rpc('admin_create_backup', {
        p_admin_email: adminEmail,
        p_backup_type: backupType
      });

      if (err) throw err;

      await fetchBackups();
      await fetchStatistics();

      return { success: true, data };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'فشل إنشاء النسخة الاحتياطية';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const deleteBackup = async (backupId: string) => {
    try {
      const { data, error: err } = await supabase.rpc('admin_delete_backup', {
        p_admin_email: adminEmail,
        p_backup_id: backupId
      });

      if (err) throw err;

      await fetchBackups();
      await fetchStatistics();

      return { success: true, data };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'فشل حذف النسخة الاحتياطية';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const configureSchedule = async (
    scheduleType: 'daily' | 'weekly' | 'monthly',
    scheduleTime: string,
    isActive: boolean
  ) => {
    try {
      const { data, error: err } = await supabase.rpc('admin_configure_backup_schedule', {
        p_schedule_type: scheduleType,
        p_schedule_time: scheduleTime,
        p_is_active: isActive
      });

      if (err) throw err;

      await fetchSchedules();

      return { success: true, data };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'فشل تكوين الجدول';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const logRestoration = async (
    backupId: string,
    tablesRestored: any,
    status: 'completed' | 'in_progress' | 'failed',
    notes?: string
  ) => {
    try {
      const { data, error: err } = await supabase.rpc('admin_log_restoration', {
        p_backup_id: backupId,
        p_admin_email: adminEmail,
        p_tables_restored: tablesRestored,
        p_status: status,
        p_notes: notes || null
      });

      if (err) throw err;

      await fetchRestorationLogs();

      return { success: true, data };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'فشل تسجيل الاستعادة';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([
        fetchBackups(),
        fetchSchedules(),
        fetchRestorationLogs(),
        fetchStatistics()
      ]);
      setLoading(false);
    };

    init();

    const backupsChannel = supabase
      .channel('database_backups_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'database_backups' }, () => {
        fetchBackups();
        fetchStatistics();
      })
      .subscribe();

    const schedulesChannel = supabase
      .channel('backup_schedules_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'backup_schedules' }, () => {
        fetchSchedules();
      })
      .subscribe();

    const restorationsChannel = supabase
      .channel('restoration_logs_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restoration_logs' }, () => {
        fetchRestorationLogs();
      })
      .subscribe();

    return () => {
      backupsChannel.unsubscribe();
      schedulesChannel.unsubscribe();
      restorationsChannel.unsubscribe();
    };
  }, [adminEmail]);

  return {
    backups,
    schedules,
    restorationLogs,
    statistics,
    loading,
    error,
    createBackup,
    deleteBackup,
    configureSchedule,
    logRestoration,
    refresh: async () => {
      await Promise.all([
        fetchBackups(),
        fetchSchedules(),
        fetchRestorationLogs(),
        fetchStatistics()
      ]);
    }
  };
}
