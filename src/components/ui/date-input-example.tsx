import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Label } from './label';
import { Input } from './input';
import { Button } from './button';

export const DateInputExample: React.FC = () => {
  const { t } = useTranslation();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [singleDate, setSingleDate] = useState('');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Normal Date Inputs with Dark Theme Support</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Date Input */}
          <div className="space-y-2">
            <Label>Basic Date Input</Label>
            <Input
              type="date"
              value={singleDate}
              onChange={(e) => setSingleDate(e.target.value)}
              placeholder="Select a date"
            />
          </div>

          {/* Date Range */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Date Range</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={endDate || undefined}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || undefined}
                />
              </div>
            </div>
          </div>

          {/* Date Input with Constraints */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Date Input with Constraints</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Future Date Only</Label>
                <Input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  placeholder="Select future date"
                />
              </div>
              <div className="space-y-2">
                <Label>Past Date Only</Label>
                <Input
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  placeholder="Select past date"
                />
              </div>
            </div>
          </div>

          {/* Form Example */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-medium">Form Example</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Birth Date</Label>
                <Input
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  placeholder="Select birth date"
                />
              </div>
              <div className="space-y-2">
                <Label>Appointment Date</Label>
                <Input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  placeholder="Select appointment date"
                />
              </div>
              <div className="space-y-2">
                <Label>Project Start</Label>
                <Input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  placeholder="Select project start date"
                />
              </div>
              <div className="space-y-2">
                <Label>Project End</Label>
                <Input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  placeholder="Select project end date"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="submit">Submit</Button>
              <Button variant="outline" type="button">Cancel</Button>
            </div>
          </div>

          {/* Current Values Display */}
          <div className="space-y-2 pt-4 border-t">
            <h3 className="text-lg font-medium">Current Values</h3>
            <div className="text-sm text-muted-foreground">
              <p>Single Date: {singleDate || 'None'}</p>
              <p>Start Date: {startDate || 'None'}</p>
              <p>End Date: {endDate || 'None'}</p>
            </div>
          </div>

          {/* Benefits Section */}
          <div className="space-y-2 pt-4 border-t">
            <h3 className="text-lg font-medium">Benefits of Normal Date Inputs</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>✅ Native browser support - works on all devices</p>
              <p>✅ Built-in accessibility features</p>
              <p>✅ Automatic dark theme support</p>
              <p>✅ No additional dependencies</p>
              <p>✅ Better performance</p>
              <p>✅ Consistent across browsers</p>
              <p>✅ Mobile-friendly date picker</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 