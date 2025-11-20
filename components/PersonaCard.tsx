import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PersonaCardProps {
  title: string;
  content: string | string[];
  icon: LucideIcon;
  colorClass: string;
  fullWidth?: boolean;
}

const PersonaCard: React.FC<PersonaCardProps> = ({ title, content, icon: Icon, colorClass, fullWidth = false }) => {
  return (
    <div className={`bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 ${fullWidth ? 'col-span-1 md:col-span-2 lg:col-span-3' : 'col-span-1'}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-3 rounded-xl ${colorClass} bg-opacity-10`}>
          <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
        </div>
        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
      </div>
      
      <div className="text-slate-600 leading-relaxed text-sm md:text-base">
        {Array.isArray(content) ? (
          <div className="flex flex-wrap gap-2">
            {content.map((tag, idx) => (
              <span key={idx} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-medium">
                #{tag}
              </span>
            ))}
          </div>
        ) : (
          content.split('\n').map((line, i) => (
            <p key={i} className="mb-2 last:mb-0">{line}</p>
          ))
        )}
      </div>
    </div>
  );
};

export default PersonaCard;