import { memo } from "react";
import { Check, User, MapPin, Truck, AlertTriangle } from "lucide-react";

type Voter = {
    id: string;
    document_id: string;
    first_name: string;
    last_name: string;
    voting_table_number: number;
    status_day_d: 'PENDING' | 'SEARCHING' | 'ON_TRANSIT' | 'ARRIVED' | 'CHECKED_IN' | 'VOTED';
    logistics_flag: boolean;
    has_incentive: boolean;
};

type Props = {
    voter: Voter;
    onStatusChange: (id: string, status: string) => void;
    onIncentiveClick: (id: string, name: string) => void;
};

const statusColors = {
    PENDING: "bg-gray-100 text-gray-500",
    SEARCHING: "bg-orange-100 text-orange-700 animate-pulse",
    ON_TRANSIT: "bg-yellow-100 text-yellow-700",
    ARRIVED: "bg-blue-100 text-blue-700",
    CHECKED_IN: "bg-purple-100 text-purple-700",
    VOTED: "bg-green-100 text-green-700 border-green-200"
};

const VoterRow = memo(({ voter, onStatusChange, onIncentiveClick }: Props) => {
    
    // Función de Click Rápido para avanzar estado
    const handleNextStatus = () => {
        const flow = ['PENDING', 'SEARCHING', 'ON_TRANSIT', 'ARRIVED', 'CHECKED_IN', 'VOTED'];
        const currentIdx = flow.indexOf(voter.status_day_d);
        if (currentIdx < flow.length - 1) {
            onStatusChange(voter.id, flow[currentIdx + 1]);
        }
    };

    return (
        <div className={`flex items-center p-2 border-b border-gray-100 hover:bg-gray-50 transition-colors ${voter.status_day_d === 'VOTED' ? 'bg-green-50/30' : ''}`}>
            {/* 1. Status Visual (Semáforo) */}
            <button 
                onClick={handleNextStatus}
                className={`w-28 flex-shrink-0 text-[10px] font-bold px-2 py-1 rounded border mr-4 text-center ${statusColors[voter.status_day_d] || 'bg-gray-100'}`}
            >
                {voter.status_day_d}
            </button>

            {/* 2. Datos Clave */}
            <div className="flex-1 min-w-0 mr-4">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 truncate">
                        {voter.last_name}, {voter.first_name}
                    </span>
                    {voter.logistics_flag && (
                        <Truck size={14} className="text-blue-500" />
                    )}
                </div>
                <div className="text-xs text-gray-500 font-mono">
                    CI: {voter.document_id} • Mesa {voter.voting_table_number}
                </div>
            </div>

            {/* 3. Acciones Rápidas */}
            <div className="flex items-center gap-2">
                {/* Botón Logística (Auto) */}
                <button 
                    onClick={() => onStatusChange(voter.id, 'ON_TRANSIT')}
                    className={`p-1.5 rounded hover:bg-gray-200 ${voter.status_day_d === 'ON_TRANSIT' ? 'text-yellow-600 bg-yellow-50' : 'text-gray-400'}`}
                    title="En Tránsito"
                >
                    <Truck size={16} />
                </button>

                {/* Botón Local (Pin) */}
                <button 
                     onClick={() => onStatusChange(voter.id, 'ARRIVED')}
                     className={`p-1.5 rounded hover:bg-gray-200 ${voter.status_day_d === 'ARRIVED' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}
                     title="En Local"
                >
                    <MapPin size={16} />
                </button>

                {/* Celda Discreta (Incentivo) */}
                <button 
                    onClick={() => onIncentiveClick(voter.id, `${voter.first_name} ${voter.last_name}`)}
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${voter.has_incentive ? 'bg-green-500 text-white' : 'bg-gray-100 hover:bg-gray-200 text-transparent hover:text-gray-400'}`}
                >
                    <span className="w-1.5 h-1.5 bg-current rounded-full" />
                </button>
            </div>
        </div>
    );
});

VoterRow.displayName = "VoterRow";

export default VoterRow;
