import { useEffect, useState } from 'react';
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

const TABS = [
  { id: 'readme', label: 'README' },
  { id: 'project', label: 'Project' },
  { id: 'github', label: 'GitHub' },
  { id: 'ai', label: 'AI Review' },
];

export function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [review, setReview] = useState<ReviewDetail | null>(null);
  const [github, setGithub] = useState<GitHubRepo | null>(null);
  const [notes, setNotes] = useState<NotesState>({ projectNote: '', userNote: '' });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('readme');

  useEffect(() => {
    Promise.all([
      fetch('/fixtures/review.json').then((r) => r.json()),
      fetch('/fixtures/github.json').then((r) => r.json()),
      fetch('/fixtures/notes.json').then((r) => r.json()),
    ]).then(([reviewData, githubData, notesData]) => {
      setReview(reviewData as ReviewDetail);
      setGithub(githubData as GitHubRepo);
      setNotes(notesData as NotesState);
      setLoading(false);
    });
  }, [id]);

  if (loading || !review) {
    return (
      <div className="h-screen bg-bg flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-bg overflow-hidden">
      <TopBar onBackToGallery={() => navigate('/')} />

      <div className="flex-1 grid grid-cols-[280px_1fr_340px] overflow-hidden">
        {/* LEFT PANEL */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-surface border-r border-border overflow-y-auto"
        >
          <UserInfo user={review.owner} project={review.project} />
          <NotesSection title="Notes — Project" initialContent={notes.projectNote} />
          <NotesSection title="Notes — User" initialContent={notes.userNote} />
          <ReviewHistory timeline={review.timeline} />
        </motion.div>

        {/* CENTER PANEL */}
        <div className="flex flex-col overflow-hidden bg-bg">
          <TabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="flex-1 overflow-hidden relative">
            {activeTab === 'readme' && <ReadmePanel readmeUrl={review.project.readmeUrl} />}
            {activeTab === 'project' && (
              <ProjectInfoPanel
                project={review.project}
                description={review.description}
                aiDeclaration={review.aiDeclaration}
                links={review.links}
                submissionMeta={review.submissionMeta}
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
          <VerdictPanel review={review} onSubmitted={() => navigate('/')} />
        </motion.div>
      </div>
    </div>
  );
}
