// Temporary file for dialog sections - will be inserted into BedsListPage.tsx

{
  /* Add Bed Dialog */
}
<Dialog open={addDialogOpen} onClose={handleAddCancel} maxWidth="sm" fullWidth>
  <DialogTitle>إضافة سرير جديد</DialogTitle>
  <form
    onSubmit={(e) => {
      e.preventDefault();
      handleAddConfirm();
    }}
  >
    <DialogContent>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
        <FormControl fullWidth required>
          <InputLabel>الغرفة</InputLabel>
          <Select
            value={newBed.room_id || ""}
            label="الغرفة"
            onChange={(e) =>
              setNewBed({ ...newBed, room_id: e.target.value as string })
            }
          >
            {rooms?.map((room) => {
              const roomTypeLabel =
                room.room_type === "normal"
                  ? "عادي"
                  : room.room_type === "vip"
                    ? "VIP"
                    : "";
              const roomTypeDisplay = roomTypeLabel
                ? ` (${roomTypeLabel})`
                : "";
              return (
                <MenuItem key={room.id} value={room.id}>
                  {room.room_number}
                  {roomTypeDisplay} - {room.ward?.name}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>

        <TextField
          label="رقم السرير"
          required
          fullWidth
          value={newBed.bed_number}
          onChange={(e) => setNewBed({ ...newBed, bed_number: e.target.value })}
        />

        <FormControl fullWidth required>
          <InputLabel>الحالة</InputLabel>
          <Select
            value={newBed.status}
            label="الحالة"
            onChange={(e) =>
              setNewBed({
                ...newBed,
                status: e.target.value as
                  | "available"
                  | "occupied"
                  | "maintenance",
              })
            }
          >
            <MenuItem value="available">متاح</MenuItem>
            <MenuItem value="occupied">مشغول</MenuItem>
            <MenuItem value="maintenance">صيانة</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </DialogContent>
    <DialogActions>
      <Button onClick={handleAddCancel}>إلغاء</Button>
      <Button
        type="submit"
        variant="contained"
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? <CircularProgress size={20} /> : "إضافة"}
      </Button>
    </DialogActions>
  </form>
</Dialog>;

{
  /* Edit Bed Dialog */
}
<Dialog
  open={editDialogOpen}
  onClose={handleEditCancel}
  maxWidth="sm"
  fullWidth
>
  <DialogTitle>تعديل السرير</DialogTitle>
  <form
    onSubmit={(e) => {
      e.preventDefault();
      handleEditConfirm();
    }}
  >
    <DialogContent>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
        <FormControl fullWidth required>
          <InputLabel>الغرفة</InputLabel>
          <Select
            value={editBed.room_id || ""}
            label="الغرفة"
            onChange={(e) =>
              setEditBed({ ...editBed, room_id: e.target.value as string })
            }
          >
            {rooms?.map((room) => {
              const roomTypeLabel =
                room.room_type === "normal"
                  ? "عادي"
                  : room.room_type === "vip"
                    ? "VIP"
                    : "";
              const roomTypeDisplay = roomTypeLabel
                ? ` (${roomTypeLabel})`
                : "";
              return (
                <MenuItem key={room.id} value={room.id}>
                  {room.room_number}
                  {roomTypeDisplay} - {room.ward?.name}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>

        <TextField
          label="رقم السرير"
          required
          fullWidth
          value={editBed.bed_number}
          onChange={(e) =>
            setEditBed({ ...editBed, bed_number: e.target.value })
          }
        />

        <FormControl fullWidth required>
          <InputLabel>الحالة</InputLabel>
          <Select
            value={editBed.status}
            label="الحالة"
            onChange={(e) =>
              setEditBed({
                ...editBed,
                status: e.target.value as
                  | "available"
                  | "occupied"
                  | "maintenance",
              })
            }
          >
            <MenuItem value="available">متاح</MenuItem>
            <MenuItem value="occupied">مشغول</MenuItem>
            <MenuItem value="maintenance">صيانة</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </DialogContent>
    <DialogActions>
      <Button onClick={handleEditCancel}>إلغاء</Button>
      <Button
        type="submit"
        variant="contained"
        disabled={updateMutation.isPending}
      >
        {updateMutation.isPending ? <CircularProgress size={20} /> : "حفظ"}
      </Button>
    </DialogActions>
  </form>
</Dialog>;
