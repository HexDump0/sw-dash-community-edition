import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TopBar } from '../components/review/TopBar';
import { TabBar } from '../components/review/TabBar';
import { UserInfo } from '../components/review/UserInfo';
import { NotesSection } from '../components/review/NotesSection';
import { ReviewHistory } from '../components/review/ReviewHistory';
import { GitHubPanel } from '../components/review/GitHubPanel';
import { ReviewChecklist } from '../components/review/ReviewChecklist';
import { VerdictPanel } from '../components/review/VerdictPanel';
import { ProjectCardPanel } from '../components/review/ProjectCardPanel';
import { ReadmePanel } from '../components/review/ReadmePanel';
import { DemoIframe } from '../components/review/DemoIframe';
import { SwReviewerPanel } from '../components/review/SwReviewerPanel';
import type { ReviewDetail, GitHubRepo, ChecklistState, NotesState } from '../types';

const TABS = [
  { id: 'readme', label: 'README' },
  { id: 'demo', label: 'Demo' },
  { id: 'card', label: 'Project Card' },
  { id: 'ai', label: 'AI Review' },
  { id: 'verdict', label: 'Verdict' },
];

export function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [review, setReview] = useState<ReviewDetail | null>(null);
  const [github, setGithub] = useState<GitHubRepo | null>(null);
  const [checklist, setChecklist] = useState<ChecklistState>({ checkedItems: [] });
  const [notes, setNotes] = useState<NotesState>({ projectNote: '', userNote: '' });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('readme');

  useEffect(() => {
    Promise.all([
      fetch('/fixtures/review.json').then((r) => r.json()),
      fetch('/fixtures/github.json').then((r) => r.json()),
      fetch('/fixtures/checklist.json').then((r) => r.json()),
      fetch('/fixtures/notes.json').then((r) => r.json()),
    ]).then(([reviewData, githubData, checklistData, notesData]) => {
      setReview(reviewData as ReviewDetail);
      setGithub(githubData as GitHubRepo);
      setChecklist(checklistData as ChecklistState);
      setNotes(notesData as NotesState);
      setLoading(false);
    });
  }, [id]);

  if (loading || !review) {
    return (
      <div className="h-screen bg-[#08061E] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#F4EBB9] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#08061E] overflow-hidden">
      <TopBar
        currentIndex={0}
        totalCount={1}
        onNext={() => {}}
        onPrev={() => {}}
        onBackToGallery={() => navigate('/')}
      />

      <div className="flex-1 grid grid-cols-[300px_1fr_320px] overflow-hidden">
        {/* LEFT PANEL */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-[#0E0C25] border-r border-[rgba(131,130,141,0.25)] overflow-y-auto"
        >
          <UserInfo user={review.owner} project={review.project} />
          <NotesSection title="Notes — Project" initialContent={notes.projectNote} />
          <NotesSection title="Notes — User" initialContent={notes.userNote} />
          <ReviewHistory timeline={review.timeline} />
        </motion.div>

        {/* CENTER PANEL */}
        <div className="flex flex-col overflow-hidden bg-[#08061E]">
          <TabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="flex-1 overflow-hidden relative">
            {activeTab === 'readme' && <ReadmePanel readmeUrl={review.project.readmeUrl} />}
            {activeTab === 'demo' && <DemoIframe demoUrl={review.project.playableUrl} />}
            {activeTab === 'card' && <ProjectCardPanel project={review.project} />}
            {activeTab === 'ai' && <SwReviewerPanel />}
            {activeTab === 'verdict' && <VerdictPanel review={review} />}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-[#0E0C25] border-l border-[rgba(131,130,141,0.25)] flex flex-col overflow-hidden"
        >
          <div className="flex-1 min-h-0">
            <GitHubPanel
              repo={github}
              loading={false}
              error={null}
              repoUrl={review.project.repoUrl}
            />
          </div>
          <ReviewChecklist initial={checklist} />
        </motion.div>
      </div>
    </div>
  );
}
