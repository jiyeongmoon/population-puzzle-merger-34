
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Users, Factory, TreePine } from 'lucide-react';

interface IndicatorTabsProps {
  children: React.ReactNode;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

const IndicatorTabs: React.FC<IndicatorTabsProps> = ({ 
  children, 
  defaultValue = "population",
  onValueChange
}) => {
  return (
    <Tabs 
      defaultValue={defaultValue} 
      className="w-full" 
      onValueChange={onValueChange}
    >
      <TabsList className="grid grid-cols-4 w-full">
        <TabsTrigger value="population" className="flex items-center gap-1.5">
          <Users className="h-4 w-4" />
          <span>Population-Social</span>
        </TabsTrigger>
        <TabsTrigger value="industry" className="flex items-center gap-1.5">
          <Factory className="h-4 w-4" />
          <span>Industrial-Economy</span>
        </TabsTrigger>
        <TabsTrigger value="environment" className="flex items-center gap-1.5">
          <TreePine className="h-4 w-4" />
          <span>Physical-Environment</span>
        </TabsTrigger>
        <TabsTrigger value="summary" className="flex items-center gap-1.5">
          <BarChart3 className="h-4 w-4" />
          <span>Summary</span>
        </TabsTrigger>
      </TabsList>
      
      {children}
    </Tabs>
  );
};

export default IndicatorTabs;
