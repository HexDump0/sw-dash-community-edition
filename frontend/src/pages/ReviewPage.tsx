import { useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TopBar } from '../components/review/TopBar';
import { TabBar } from '../components/review/TabBar';
import { UserInfo } from '../components/review/UserInfo';
import { NotesSection } from '../components/review/NotesSection';
import { ReviewHistory } from '../components/review/ReviewHistory';
import { GitHubPanel } from '../components/review/GitHubPanel';
import { VerdictPanel } from '../components/review/VerdictPanel';
import { ProjectInfoPanel } from '../components/review/ProjectInfoPanel';
import { ReadmePanel } from '../components/review/ReadmePanel';
import { SwReviewerPanel } from '../components/review/SwReviewerPanel';
import type { ReviewDetail, GitHubRepo, NotesState } from '../types';
import { usePollingData } from '../lib/usePollingData';
import { ApiError, getReview, getGitHub, getReadme } from '../lib/api';

const TABS = [
  { id: 'readme', label: 'README' },
  { id: 'project', label: 'Project' },
  { id: 'github', label: 'GitHub' },
  { id: 'ai', label: 'AI Review' },
];

export function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const certId = Number(id);
  const [review, setReview] = useState<ReviewDetail | null>(null);
  const [github, setGithub] = useState<GitHubRepo | null>(null);
  const [notes, setNotes] = useState<NotesState>({ projectNote: '', userNote: '' });
  const [readme, setReadme] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('readme');

  const reviewFetcher = useCallback(async () => {
    let reviewData: ReviewDetail & { notes: NotesState; };
    try {
      reviewData = await getReview(certId);
    } catch (e) {
      if (e instanceof ApiError && e.payload?.error === 'session_dead') {
        throw new Error('Your Stardance session expired. Please restart the backend with a fresh cookie.', { cause: e });
      }
      throw new Error(e instanceof ApiError ? e.message : 'Failed to load review.', { cause: e });
    }
    setReview(reviewData);
    setNotes(reviewData.notes || { projectNote: '', userNote: '' });

    if (reviewData.project?.readmeUrl) {
      getReadme(reviewData.project.readmeUrl)
        .then((r) => setReadme(r?.content || null))
        .catch(() => setReadme(null));
    } else {
      setReadme(null);
    }
    if (reviewData.project?.repoUrl) {
      getGitHub(reviewData.project.repoUrl)
        .then((g) => setGithub(g))
        .catch(() => setGithub(null));
    } else {
      setGithub(null);
    }
    return reviewData;
  }, [certId]);

  const { loading, error, refresh: load } = usePollingData(reviewFetcher, [certId], 30000);

  if (loading || !review) {
    return (
      <div className="h-screen bg-bg flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        {error && (
          <div className="max-w-md px-4 py-3 rounded-lg bg-red-subtle border border-red/30 text-red text-[13px] text-center">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-bg overflow-hidden">
      <TopBar onBackToGallery={() => navigate('/')} />
      {error && (
        <div className="shrink-0 px-4 py-2 bg-red-subtle border-b border-red/30 text-red text-[13px]">
          {error}
        </div>
      )}

      <div className="flex-1 grid grid-cols-[280px_1fr_340px] overflow-hidden">
        {/* LEFT PANEL */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-surface border-r border-border overflow-y-auto"
        >
          <UserInfo user={review.owner} project={review.project} />
          <NotesSection title="Notes — Project" notes={notes} certId={certId} field="projectNote" onChange={setNotes} />
          <NotesSection title="Notes — User" notes={notes} certId={certId} field="userNote" onChange={setNotes} />
          <ReviewHistory timeline={review.timeline} />
        </motion.div>

        {/* CENTER PANEL */}
        <div className="flex flex-col overflow-hidden bg-bg">
          <TabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="flex-1 overflow-hidden relative">
            {activeTab === 'readme' && <ReadmePanel content={readme} readmeUrl={review.project.readmeUrl} loading={readme === null && !!review.project.readmeUrl} />}
            {activeTab === 'project' && (
              <ProjectInfoPanel
                project={review.project}
                description={review.description}
                aiDeclaration={review.aiDeclaration}
                submissionMeta={review.submissionMeta}
                bannerUrl={review.project.screenshotUrl}
                devlogs={review.devlogs}
              />
            )}
            {activeTab === 'github' && (
              <GitHubPanel
                repo={github}
                loading={false}
                error={null}
                repoUrl={review.project.repoUrl}
              />
            )}
            {activeTab === 'ai' && <SwReviewerPanel />}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-surface border-l border-border overflow-y-auto"
        >
          <VerdictPanel review={review} certId={certId} onSubmitted={() => navigate('/')} onRefresh={load} />
        </motion.div>
      </div>
    </div>
  );
}
