// src/components/lab/workstation/OrganismTable.tsx
import React, { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

// MUI Imports
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";

import type { RequestedOrganism } from "@/types/visits";
import { addOrganism, updateOrganism, deleteOrganism } from "@/services/labRequestService";
import OrganismCodeEditor from "./OrganismCodeEditor";

interface OrganismTableProps {
  organisms: RequestedOrganism[];
  labRequestId: number;
  onOrganismsChange: (organisms: RequestedOrganism[]) => void;
}


const OrganismTable: React.FC<OrganismTableProps> = ({
  organisms,
  labRequestId,
  onOrganismsChange,
}) => {
  const [newOrganismName, setNewOrganismName] = useState("");
  
  // Local state for editing organisms
  const [editingOrganisms, setEditingOrganisms] = useState<Map<number, RequestedOrganism>>(new Map());

  const createOrganismMutation = useMutation({
    mutationFn: (organismName: string) => addOrganism(labRequestId, {
      organism: organismName,
      sensitive: '',
      resistant: ''
    }),
    onSuccess: (newOrganism) => {
      // Convert the response to RequestedOrganism format
      const organism: RequestedOrganism = {
        id: newOrganism.organism.id,
        lab_request_id: labRequestId,
        organism: newOrganism.organism.organism,
        sensitive: newOrganism.organism.sensitive || '',
        resistant: newOrganism.organism.resistant || ''
      };
      onOrganismsChange([...organisms, organism]);
      setNewOrganismName("");
      toast.success("Organism added successfully");
    },
    onError: () => {
      toast.error("Failed to add organism");
    },
  });

  const updateOrganismMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<RequestedOrganism> }) => 
      updateOrganism(id, data),
    onSuccess: (updatedOrganism) => {
      const updatedOrganisms = organisms.map(org => 
        org.id === updatedOrganism.id ? updatedOrganism : org
      );
      onOrganismsChange(updatedOrganisms);
      // Remove from editing state
      setEditingOrganisms(prev => {
        const newMap = new Map(prev);
        newMap.delete(updatedOrganism.id);
        return newMap;
      });
      toast.success("Organism updated successfully");
    },
    onError: () => {
      toast.error("Failed to update organism");
    },
  });

  const deleteOrganismMutation = useMutation({
    mutationFn: (organismId: number) => deleteOrganism(organismId),
    onSuccess: (_, organismId) => {
      const updatedOrganisms = organisms.filter(org => org.id !== organismId);
      onOrganismsChange(updatedOrganisms);
      toast.success("Organism deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete organism");
    },
  });


  // Handle local editing changes
  const handleFieldChange = useCallback((organismId: number, field: keyof RequestedOrganism, value: string) => {
    setEditingOrganisms(prev => {
      const newMap = new Map(prev);
      const currentOrganism = organisms.find(org => org.id === organismId);
      if (currentOrganism) {
        const updatedOrganism = { ...currentOrganism, [field]: value };
        newMap.set(organismId, updatedOrganism);
      }
      return newMap;
    });
  }, [organisms]);

  // Save organism changes
  const handleSaveOrganism = useCallback((organismId: number) => {
    const editingOrganism = editingOrganisms.get(organismId);
    if (editingOrganism) {
      updateOrganismMutation.mutate({
        id: organismId,
        data: {
          organism: editingOrganism.organism,
          sensitive: editingOrganism.sensitive,
          resistant: editingOrganism.resistant
        }
      });
    }
  }, [editingOrganisms, updateOrganismMutation]);

  const handleDeleteOrganism = useCallback((organismId: number) => {
    if (window.confirm("Are you sure you want to delete this organism?")) {
      deleteOrganismMutation.mutate(organismId);
    }
  }, [deleteOrganismMutation]);


  return (
    <Box sx={{ p: 2}}>
      
      {/* Add new organism */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <OrganismCodeEditor
            value={newOrganismName}
            onChange={setNewOrganismName}
            placeholder="Enter organism name..."
            height="60px"
            type="organism"
          />
          <Button
            variant="contained"
            size="small"
            onClick={() => {
              if (newOrganismName.trim()) {
                createOrganismMutation.mutate(newOrganismName.trim());
              }
            }}
            disabled={!newOrganismName.trim() || createOrganismMutation.isPending}
            sx={{ minWidth: 'auto', px: 2, fontSize: '0.9rem' }}
          >
            Add
          </Button>
        </Box>
      </Box>

      {/* Organisms table */}
      {organisms.length === 0 ? (
        <Typography sx={{ textAlign: 'center', color: 'text.secondary', py: 2, fontSize: '0.9rem' }}>
          No organisms added
        </Typography>
      ) : (
        <TableContainer component={Paper} sx={{ 
          backgroundColor: "var(--background)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
        }}>
          <Table  size="small" sx={{
            "& .MuiTableCell-root": {
              direction:'ltr',
              textAlign: 'left',
              padding: "12px 16px",
              fontSize: "0.9rem",
              borderBottomColor: "var(--border)",
            },
            "& .cm-editor": {
              direction: 'ltr !important',
              textAlign: 'left !important'
            },
            "& .cm-content": {
              direction: 'ltr !important',
              textAlign: 'left !important'
            }
          }}>
            <TableHead sx={{ 
              backgroundColor: "var(--muted)",
              "& .MuiTableCell-root": {
                backgroundColor: "var(--muted)",
                color: "var(--foreground)",
                fontWeight: "medium",
                fontSize: "0.9rem",
              }
            }}>
              <TableRow>
                <TableCell sx={{ width: "25%" }}>Organism Name</TableCell>
                <TableCell sx={{ width: "30%" }}>Sensitive To</TableCell>
                <TableCell sx={{ width: "30%" }}>Resistant To</TableCell>
                <TableCell sx={{ width: "15%" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {organisms.map((organism) => {
                const editingOrganism = editingOrganisms.get(organism.id) || organism;
                const hasChanges = editingOrganisms.has(organism.id);
                const isSaving = updateOrganismMutation.isPending;
                
                return (
                  <TableRow key={organism.id} sx={{
                    "&:hover": {
                      backgroundColor: "var(--muted)",
                    }
                  }}>
                    <TableCell className="organism-table-cell" sx={{ direction: 'ltr', textAlign: 'left' }}>
                      <OrganismCodeEditor
                        value={editingOrganism.organism || ''}
                        onChange={(value) => handleFieldChange(organism.id, 'organism', value)}
                        height="80px"
                        placeholder="Enter organism name..."
                        table="organism"
                      />
                    </TableCell>
                    <TableCell className="organism-table-cell" sx={{ direction: 'ltr', textAlign: 'left' }}>
                      <OrganismCodeEditor
                      
                        value={editingOrganism.sensitive || ''}
                        onChange={(value) => handleFieldChange(organism.id, 'sensitive', value)}
                        height="80px"
                        placeholder="Enter sensitive antibiotics..."
                        table="drugs"
                      />
                    </TableCell>
                    <TableCell className="organism-table-cell" sx={{ direction: 'ltr', textAlign: 'left' }}>
                      <OrganismCodeEditor
                        value={editingOrganism.resistant || ''}
                        onChange={(value) => handleFieldChange(organism.id, 'resistant', value)}
                        height="80px"
                        placeholder="Enter resistant antibiotics..."
                        table="drugs"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          onClick={() => handleSaveOrganism(organism.id)}
                          disabled={!hasChanges || isSaving}
                          startIcon={isSaving ? <CircularProgress size={16} /> : <SaveIcon />}
                          sx={{ 
                            minWidth: 'auto', 
                            px: 1,
                            fontSize: '0.8rem',
                            opacity: hasChanges ? 1 : 0.5,
                            width: '100%'
                          }}
                        >
                          {isSaving ? 'Saving...' : 'Save'}
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => handleDeleteOrganism(organism.id)}
                          disabled={deleteOrganismMutation.isPending}
                          startIcon={deleteOrganismMutation.isPending ? <CircularProgress size={16} /> : <DeleteIcon />}
                          sx={{ 
                            minWidth: 'auto', 
                            p: 0.5,
                            fontSize: '0.8rem',
                            width: '100%'
                          }}
                        >
                          Delete
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default OrganismTable;
