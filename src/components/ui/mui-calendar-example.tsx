import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DarkThemeDatePicker, DarkThemeCalendarButton, DarkThemeCalendarPopover } from './mui-calendar';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Label } from './label';
import { Button } from './button';
import { format } from 'date-fns';

export const MuiCalendarExample: React.FC = () => {
  const { t } = useTranslation();
  const [datePickerValue, setDatePickerValue] = useState<Date | null>(null);
  const [calendarButtonValue, setCalendarButtonValue] = useState<Date | null>(null);
  const [calendarAnchorEl, setCalendarAnchorEl] = useState<HTMLElement | null>(null);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dark Theme Compatible MUI Calendar Components</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* DatePicker Examples */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">DatePicker Examples</h3>
            
            <div className="space-y-2">
              <Label>Basic DatePicker</Label>
              <DarkThemeDatePicker
                value={datePickerValue}
                onChange={setDatePickerValue}
                placeholder="Select a date"
                fullWidth
              />
            </div>

            <div className="space-y-2">
              <Label>DatePicker with Label and Helper Text</Label>
              <DarkThemeDatePicker
                value={datePickerValue}
                onChange={setDatePickerValue}
                label="Appointment Date"
                helperText="Select your preferred appointment date"
                fullWidth
              />
            </div>

            <div className="space-y-2">
              <Label>Small DatePicker</Label>
              <DarkThemeDatePicker
                value={datePickerValue}
                onChange={setDatePickerValue}
                size="small"
                placeholder="Small date picker"
              />
            </div>

            <div className="space-y-2">
              <Label>DatePicker with Min/Max Dates</Label>
              <DarkThemeDatePicker
                value={datePickerValue}
                onChange={setDatePickerValue}
                minDate={new Date()}
                maxDate={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)} // 30 days from now
                label="Select date (next 30 days)"
                fullWidth
              />
            </div>
          </div>

          {/* Calendar Button Examples */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Calendar Button Examples</h3>
            
            <div className="space-y-2">
              <Label>Basic Calendar Button</Label>
              <DarkThemeCalendarButton
                value={calendarButtonValue}
                placeholder="Pick a date"
                onClick={(event) => setCalendarAnchorEl(event.currentTarget)}
              />
              <DarkThemeCalendarPopover
                open={Boolean(calendarAnchorEl)}
                anchorEl={calendarAnchorEl}
                onClose={() => setCalendarAnchorEl(null)}
                value={calendarButtonValue}
                onChange={(date) => {
                  setCalendarButtonValue(date);
                  setCalendarAnchorEl(null);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Calendar Button with Label</Label>
              <DarkThemeCalendarButton
                label="Event Date"
                value={calendarButtonValue}
                placeholder="Select event date"
                onClick={(event) => setCalendarAnchorEl(event.currentTarget)}
              />
            </div>

            <div className="space-y-2">
              <Label>Disabled Calendar Button</Label>
              <DarkThemeCalendarButton
                value={calendarButtonValue}
                placeholder="Disabled button"
                disabled
                onClick={(event) => setCalendarAnchorEl(event.currentTarget)}
              />
            </div>
          </div>

          {/* Form Example */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-medium">Form Example</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <DarkThemeDatePicker
                  value={datePickerValue}
                  onChange={setDatePickerValue}
                  placeholder="Select start date"
                  fullWidth
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <DarkThemeDatePicker
                  value={calendarButtonValue}
                  onChange={setCalendarButtonValue}
                  placeholder="Select end date"
                  fullWidth
                />
              </div>
              <div className="space-y-2">
                <Label>Meeting Date</Label>
                <DarkThemeCalendarButton
                  label=""
                  value={datePickerValue}
                  placeholder="Select meeting date"
                  onClick={(event) => setCalendarAnchorEl(event.currentTarget)}
                />
              </div>
              <div className="space-y-2">
                <Label>Deadline</Label>
                <DarkThemeCalendarButton
                  label=""
                  value={calendarButtonValue}
                  placeholder="Select deadline"
                  onClick={(event) => setCalendarAnchorEl(event.currentTarget)}
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
              <p>DatePicker Value: {datePickerValue ? format(datePickerValue, 'dd/MM/yyyy') : 'None'}</p>
              <p>Calendar Button Value: {calendarButtonValue ? format(calendarButtonValue, 'dd/MM/yyyy') : 'None'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 