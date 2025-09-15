import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DarkThemeTextField } from './mui-input';
import { DarkThemeAutocomplete } from './mui-autocomplete';
import { MuiThemeProvider } from './mui-theme-provider';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Label } from './label';
import { Button } from './button';

// Example options for autocomplete
const exampleOptions = [
  { id: 1, name: 'Option 1' },
  { id: 2, name: 'Option 2' },
  { id: 3, name: 'Option 3' },
  { id: 4, name: 'Option 4' },
];

export const MuiInputExample: React.FC = () => {
  const { t } = useTranslation();
  const [textValue, setTextValue] = useState('');
  const [selectedOption, setSelectedOption] = useState<{ id: number; name: string } | null>(null);

  return (
    <MuiThemeProvider>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Dark Theme Compatible MUI Inputs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* TextField Examples */}
            <div className="space-y-2">
              <Label>Basic TextField</Label>
              <DarkThemeTextField
                fullWidth
                placeholder="Enter text here..."
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>TextField with Label</Label>
              <DarkThemeTextField
                fullWidth
                label="Input Label"
                placeholder="With label..."
                helperText="This is helper text"
              />
            </div>

            <div className="space-y-2">
              <Label>Required TextField with Error</Label>
              <DarkThemeTextField
                fullWidth
                label="Required Field"
                required
                error={textValue.length < 3 && textValue.length > 0}
                helperText={textValue.length < 3 && textValue.length > 0 ? "Must be at least 3 characters" : ""}
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Number Input</Label>
              <DarkThemeTextField
                fullWidth
                type="number"
                label="Quantity"
                placeholder="0"
                inputProps={{ min: 0 }}
              />
            </div>

            <div className="space-y-2">
              <Label>Multiline TextField</Label>
              <DarkThemeTextField
                fullWidth
                multiline
                rows={4}
                label="Description"
                placeholder="Enter description..."
              />
            </div>

            {/* Autocomplete Examples */}
            <div className="space-y-2">
              <Label>Autocomplete</Label>
              <DarkThemeAutocomplete
                options={exampleOptions}
                getOptionLabel={(option) => option.name}
                value={selectedOption}
                onChange={(_, newValue) => setSelectedOption(newValue)}
                renderInput={(params) => (
                  <DarkThemeTextField
                    {...params}
                    label="Select an option"
                    placeholder="Choose from options..."
                  />
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Required Autocomplete</Label>
              <DarkThemeAutocomplete
                options={exampleOptions}
                getOptionLabel={(option) => option.name}
                value={selectedOption}
                onChange={(_, newValue) => setSelectedOption(newValue)}
                renderInput={(params) => (
                  <DarkThemeTextField
                    {...params}
                    label="Required Selection"
                    required
                    placeholder="Please select an option..."
                  />
                )}
                isOptionEqualToValue={(option, value) => option.id === value.id}
              />
            </div>

            {/* Different Variants */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Outlined Variant</Label>
                <DarkThemeTextField
                  variant="outlined"
                  placeholder="Outlined input"
                />
              </div>
              <div className="space-y-2">
                <Label>Filled Variant</Label>
                <DarkThemeTextField
                  variant="filled"
                  placeholder="Filled input"
                />
              </div>
              <div className="space-y-2">
                <Label>Standard Variant</Label>
                <DarkThemeTextField
                  variant="standard"
                  placeholder="Standard input"
                />
              </div>
            </div>

            {/* Different Sizes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Small Size</Label>
                <DarkThemeTextField
                  size="small"
                  placeholder="Small input"
                />
              </div>
              <div className="space-y-2">
                <Label>Medium Size (Default)</Label>
                <DarkThemeTextField
                  placeholder="Medium input"
                />
              </div>
              <div className="space-y-2">
                <Label>Large Size</Label>
                <DarkThemeTextField
                  size="large"
                  placeholder="Large input"
                />
              </div>
            </div>

            {/* Form Example */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-medium">Form Example</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <DarkThemeTextField
                    fullWidth
                    placeholder="Enter first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <DarkThemeTextField
                    fullWidth
                    placeholder="Enter last name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <DarkThemeTextField
                    fullWidth
                    type="email"
                    placeholder="Enter email address"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <DarkThemeTextField
                    fullWidth
                    type="tel"
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Department</Label>
                  <DarkThemeAutocomplete
                    options={exampleOptions}
                    getOptionLabel={(option) => option.name}
                    renderInput={(params) => (
                      <DarkThemeTextField
                        {...params}
                        placeholder="Select department"
                      />
                    )}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Notes</Label>
                  <DarkThemeTextField
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Enter any additional notes..."
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit">Submit</Button>
                <Button variant="outline" type="button">Cancel</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MuiThemeProvider>
  );
}; 