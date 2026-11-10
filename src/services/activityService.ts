import { supabase } from '../lib/supabase';
import { Sentence, SentenceProgress, UserActivityLog, UserStudySummary } from '../types';

/**
 * Record a single user study activity (listening, shadowing recording, or self-check evaluation)
 * with timestamp in Supabase database.
 */
export async function recordUserActivity(
  userId: string,
  sentenceId: number,
  activityType: 'listen' | 'shadowing' | 'self_check' | 'complete',
  progress: SentenceProgress,
  allProgressMap: Record<number, SentenceProgress>,
  sentences: Sentence[]
): Promise<void> {
  if (!userId) return;

  const nowIso = new Date().toISOString();

  try {
    // 1. Insert individual activity event log with timestamp
    const { error: logError } = await supabase.from('user_activities').insert({
      user_id: userId,
      sentence_id: sentenceId,
      activity_type: activityType,
      listen_count: progress.plays || 0,
      shadowing_count: progress.recordings || 0,
      speed_check: progress.selfCheck[0],
      stress_check: progress.selfCheck[1],
      intonation_check: progress.selfCheck[2],
      status: progress.status,
      created_at: nowIso,
      updated_at: nowIso,
    });

    if (logError) {
      console.warn('[ActivityService] Log insert warning:', logError.message);
    }

    // 2. Compute aggregate totals across all sentences
    const totalSentences = sentences.length || 13;
    let totalListen = 0;
    let totalShadowing = 0;
    let completedCount = 0;

    sentences.forEach((s) => {
      const p = allProgressMap[s.id];
      if (p) {
        totalListen += p.plays || 0;
        totalShadowing += p.recordings || 0;
        if (p.status === 'done') {
          completedCount += 1;
        }
      }
    });

    const progressPercent =
      totalSentences > 0 ? Math.round((completedCount / totalSentences) * 100) : 0;

    // 3. Upsert into user_progress_summary table
    const { error: summaryError } = await supabase.from('user_progress_summary').upsert(
      {
        user_id: userId,
        total_listen_count: totalListen,
        total_shadowing_count: totalShadowing,
        completed_sentences: completedCount,
        total_sentences: totalSentences,
        progress_percent: progressPercent,
        last_studied_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: 'user_id' }
    );

    if (summaryError) {
      console.warn('[ActivityService] Summary upsert warning:', summaryError.message);
    }
  } catch (err) {
    console.warn('[ActivityService] Error recording user activity:', err);
  }
}

/**
 * Fetch user activity summary and recent event logs from Supabase
 */
export async function fetchUserActivityData(
  userId: string
): Promise<{
  summary: UserStudySummary | null;
  recentLogs: UserActivityLog[];
}> {
  if (!userId) {
    return { summary: null, recentLogs: [] };
  }

  try {
    // 1. Fetch user summary row
    const { data: summaryData, error: summaryErr } = await supabase
      .from('user_progress_summary')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (summaryErr) {
      console.warn('[ActivityService] Fetch summary warning:', summaryErr.message);
    }

    // 2. Fetch recent 20 activity logs with timestamps
    const { data: logsData, error: logsErr } = await supabase
      .from('user_activities')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (logsErr) {
      console.warn('[ActivityService] Fetch logs warning:', logsErr.message);
    }

    return {
      summary: summaryData as UserStudySummary | null,
      recentLogs: (logsData || []) as UserActivityLog[],
    };
  } catch (err) {
    console.warn('[ActivityService] Fetch error:', err);
    return { summary: null, recentLogs: [] };
  }
}
