
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, Sankey, Tooltip, Rectangle, Layer } from "recharts";
import { useMemo } from "react";

interface SankeyChartProps {
    data: { nodes: any[]; links: any[] };
    title: string;
    description?: string;
    privacyMode: boolean;
    formatCurrency: (amount: number) => string;
}

const COLORS = [
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#6366f1', // Indigo
    '#14b8a6', // Teal
    '#f43f5e', // Rose
    '#84cc16', // Lime
    '#0ea5e9', // Sky
    '#d946ef', // Fuchsia
];

export function SankeyChart({ data, title, description, privacyMode, formatCurrency }: SankeyChartProps) {

    // Process data to assign colors
    const chartData = useMemo(() => {
        if (!data || !data.nodes) return { nodes: [], links: [] };

        return {
            nodes: data.nodes.map((node, index) => ({
                ...node,
                fill: node.fill || (node.name === 'Total' || node.name === 'Net Flow' ? 'var(--foreground)' : COLORS[index % COLORS.length])
            })),
            links: data.links.map((link, index) => ({
                ...link,
                fill: '#82ca9d'
            }))
        };
    }, [data]);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0];
            // Tooltip for Node
            if (data.payload && data.payload.name && !data.payload.source) {
                return (
                    <div className="bg-popover border border-border p-2 rounded-sm shadow-sm">
                        <p className="font-medium">{data.payload.name}</p>
                        <p className="text-muted-foreground">
                            {privacyMode ? "•••••" : formatCurrency(data.value)}
                        </p>
                    </div>
                );
            }

            // Tooltip for Link
            const { source, target, value } = data.payload;
            if (source && target) {
                return (
                    <div className="bg-popover border border-border p-2 rounded-sm shadow-sm">
                        <p className="font-medium text-xs text-muted-foreground">{source.name} → {target.name}</p>
                        <p className="font-bold">
                            {privacyMode ? "•••••" : formatCurrency(value)}
                        </p>
                    </div>
                );
            }
        }
        return null;
    };

    // Custom Node to support CSS variables for color if needed, but 'fill' in data usually works. 
    // Recharts Sankey Node is SVG Rect.

    const renderNode = (props: any) => {
        const { x, y, width, height, index, payload, containerWidth } = props;
        const sourceLinks = props.sourceLinks || payload.sourceLinks;
        const targetLinks = props.targetLinks || payload.targetLinks;

        const isOut = x + width + 6 > containerWidth;
        // payload usually contains the node data merged with layout data.
        // We ensure we look for 'fill' in payload or payload.node
        const fill = payload.fill || payload.node?.fill || COLORS[index % COLORS.length];

        const isNetFlow = payload.name === 'Net Flow' || payload.name === 'Total';
        // Income nodes have NO incoming links (targetLinks).
        // Expense nodes have NO outgoing links (sourceLinks).
        const isIncome = !targetLinks || targetLinks.length === 0;
        const isExpense = !sourceLinks || sourceLinks.length === 0;

        let textAnchor: 'start' | 'middle' | 'end' = 'start';
        let textX = x + width + 6;
        let textY = y + height / 2;

        if (isNetFlow) {
            textAnchor = 'middle';
            textX = x + width / 2;
        } else if (isExpense) {
            // Expenses on the right -> Label on the RIGHT (Outside)
            textAnchor = 'start';
            textX = x + width + 6;
        } else if (isIncome) {
            // Income on the left -> Label on the LEFT (Outside)
            textAnchor = 'end';
            textX = x - 6;
        }

        const value = payload.value;
        const formattedValue = privacyMode ? '•••••' : formatCurrency(value);
        const label = `${payload.name} (${formattedValue})`;

        return (
            <Layer key={`node-${index}`}>
                <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    fill={fill}
                    fillOpacity="1"
                    {...props} // Pass all props to ensure events work
                />
                <text
                    x={textX}
                    y={textY}
                    textAnchor={textAnchor}
                    fill="currentColor"
                    alignmentBaseline="middle"
                    className="text-[10px] font-medium fill-muted-foreground"
                    style={{ pointerEvents: 'none' }} // Let clicks pass through to rect/tooltip
                >
                    {label}
                </text>
            </Layer>
        );
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
            <CardContent>
                <div className="h-[400px] w-full">
                    {chartData.nodes.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <Sankey
                                data={chartData}
                                node={renderNode}
                                link={{ stroke: '#777777', strokeOpacity: 0.3 }}
                                nodePadding={20}
                                nodeWidth={15}
                                margin={{ left: 10, right: 10, top: 10, bottom: 10 }}
                            >
                                <Tooltip content={<CustomTooltip />} />
                            </Sankey>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                            No data available
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
