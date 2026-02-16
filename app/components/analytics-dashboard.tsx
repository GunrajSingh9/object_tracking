"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Activity,
  Boxes,
  Target,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { TrackedObject, AnalyticsData } from "@/app/types/tracking";

interface AnalyticsDashboardProps {
  analytics: AnalyticsData;
  trackedObjects: TrackedObject[];
  fps?: number;
}

export function AnalyticsDashboard({
  analytics,
  trackedObjects,
  fps = 0,
}: AnalyticsDashboardProps) {
  const objectDistribution = useMemo(() => {
    const distribution: Record<string, number> = {};

    trackedObjects.forEach((obj) => {
      distribution[obj.class] = (distribution[obj.class] || 0) + 1;
    });

    return Object.entries(distribution)
      .map(([name, value]) => ({
        name,
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }, [trackedObjects]);

  const uniqueObjects = useMemo(() => {
    const ids = new Set(trackedObjects.map((obj) => obj.id));
    return ids.size;
  }, [trackedObjects]);

  const avgConfidence = useMemo(() => {
    if (trackedObjects.length === 0) return 0;
    return (
      trackedObjects.reduce((acc, obj) => acc + obj.confidence, 0) /
      trackedObjects.length
    );
  }, [trackedObjects]);

  const COLORS = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FECA57",
    "#FF9FF3",
    "#54A0FF",
    "#48DBFB",
    "#1DD1A1",
    "#FFC048",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-full h-full"
    >
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="objects" className="flex items-center gap-2">
            <Boxes className="w-4 h-4" />
            Objects
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-primary" />
                    Active Objects
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{trackedObjects.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {uniqueObjects} unique tracked
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    Avg Confidence
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {(avgConfidence * 100).toFixed(1)}%
                  </div>
                  <Progress value={avgConfidence * 100} className="mt-2" />
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    FPS
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{fps}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Processing speed
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    Classes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {objectDistribution.length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Object types detected
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Object Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Object Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {objectDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={objectDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {objectDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  No objects detected
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="objects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detected Objects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {trackedObjects.length > 0 ? (
                  trackedObjects.map((obj, index) => (
                    <motion.div
                      key={obj.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: COLORS[obj.id % COLORS.length],
                          }}
                        />
                        <div>
                          <p className="font-medium">
                            {obj.class} #{obj.id}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Confidence: {(obj.confidence * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {obj.bbox[2] - obj.bbox[0]}x{obj.bbox[3] - obj.bbox[1]}
                      </Badge>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No objects currently tracked
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {objectDistribution.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Class Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={objectDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#45B7D1" radius={[4, 4, 0, 0]}>
                      {objectDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Confidence Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.confidenceHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.confidenceHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis domain={[0, 1]} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="confidence"
                      stroke="#45B7D1"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Collecting performance data...
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
