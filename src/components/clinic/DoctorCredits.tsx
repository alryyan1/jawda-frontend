import React from "react";
import { Box, Typography } from "@mui/material";

const DoctorCredits: React.FC = () => {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        استحقاقات الأطباء
      </Typography>
      <Typography variant="body2" color="text.secondary">
        سيتم عرض تفاصيل استحقاقات الأطباء هنا.
      </Typography>
    </Box>
  );
};

export default DoctorCredits;


