import { useState } from 'react';
import { Bot, FileText, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface CheckItem {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  details: string;
}

const demoChecks: CheckItem[] = [
  { name: 'README present', status: 'pass', details: 'README.md found with setup instructions' },
  { name: 'Repo accessible', status: 'pass', details: 'Public GitHub repo is reachable' },
  { name: 'Demo link', status: 'warn', details: 'Demo points to a release page, not a live build' },
  { name: 'Original work', status: 'pass', details: 'Code structure shows original implementation' },
  { name: 'Incremental commits', status: 'pass', details: '3 commits over 3 weeks' },
];

export function SwReviewerPanel() {
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setGenerated(true);
    }, 1500);
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-mauve-subtle">
              <Bot className="w-5 h-5 text-mauve" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text">sw-reviewer report</h2>
              <p className="text-[13px] text-subtext">AI-generated review checklist and verdict suggestion</p>
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating || generated}
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-mauve/30 bg-mauve-subtle text-mauve text-[13px] font-bold hover:bg-mauve/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            {generating ? (
              <><Clock className="w-4 h-4 animate-spin" /> Generating...</>
            ) : generated ? (
              <><CheckCircle2 className="w-4 h-4" /> Generated</>
            ) : (
              <><Bot className="w-4 h-4" /> Generate PDF</>
            )}
          </button>
        </div>

        {!generated ? (
          <div className="flex flex-col items-center justify-center py-16 rounded-lg border border-dashed border-border bg-surface">
            <FileText className="w-12 h-12 text-muted mb-3" />
            <p className="text-subtext text-center max-w-sm">
              No report generated yet. Click Generate PDF to run sw-reviewer on this project.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-green-subtle border border-green/25">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-5 h-5 text-green" />
                <span className="text-lg font-bold text-text">Likely to approve</span>
              </div>
              <p className="text-[13px] text-subtext">
                The project meets most shipwright standards. Main concern is the demo link pointing to a release page rather than a live build.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-border bg-surface">
              <h3 className="text-[13px] uppercase tracking-wider text-muted font-bold mb-3">Checks</h3>
              <div className="space-y-2">
                {demoChecks.map((check, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-md bg-bg">
                    {check.status === 'pass' && <CheckCircle2 className="w-4 h-4 text-green shrink-0 mt-0.5" />}
                    {check.status === 'fail' && <XCircle className="w-4 h-4 text-red shrink-0 mt-0.5" />}
                    {check.status === 'warn' && <AlertTriangle className="w-4 h-4 text-yellow shrink-0 mt-0.5" />}
                    <div>
                      <div className="text-[13px] font-bold text-text">{check.name}</div>
                      <div className="text-[12px] text-subtext">{check.details}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border bg-surface">
              <h3 className="text-[13px] uppercase tracking-wider text-muted font-bold mb-2">Suggested feedback</h3>
              <p className="text-[13px] text-subtext whitespace-pre-wrap">
                Great hackpad project! The README is thorough and the commit history shows steady progress. Consider adding a live demo (e.g. a photo/video of the pad working) since the current demo link goes to a release page.
              </p>
            </div>

            <button className="w-full py-2.5 rounded-md border border-mauve/30 bg-mauve-subtle text-mauve text-[13px] font-bold hover:bg-mauve/20 transition-all">
              Download PDF report
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
