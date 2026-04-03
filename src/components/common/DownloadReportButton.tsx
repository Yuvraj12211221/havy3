import { Download } from "lucide-react";
import { exportPageToPDF } from "../../lib/exportPDF";
import { useTimeTheme } from "../../hooks/useTimeTheme";

type Props = {
  targetId: string;
  fileName: string;
};

export default function DownloadReportButton({ targetId, fileName }: Props) {
  const theme = useTimeTheme();
  const isDark = theme === "dark";

  return (
    <div className="flex justify-center">
      <button
        onClick={() => exportPageToPDF(targetId, fileName)}
        className={`
          no-print
          flex items-center gap-2
          px-5 py-2.5
          rounded-xl
          font-medium text-sm
          border
          shadow-md hover:shadow-lg
          transition-all duration-200
          active:scale-95
          ${isDark
            ? "bg-gradient-to-r from-slate-700 to-slate-600 border-slate-500/60 text-slate-100 hover:from-slate-600 hover:to-slate-500 shadow-black/30"
            : "bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-500/30 text-white hover:from-blue-500 hover:to-indigo-500 shadow-blue-200"
          }
        `}
      >
        <Download size={16} />
        Download Report
      </button>
    </div>
  );
}
