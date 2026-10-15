export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ansuran: {
        Row: {
          bil: number
          id: string
          jumlah: number
          pinjaman_id: string
          status: string
          tarikh_dibayar: string | null
          tarikh_jatuh_tempo: string
          user_id: string
        }
        Insert: {
          bil: number
          id?: string
          jumlah: number
          pinjaman_id: string
          status?: string
          tarikh_dibayar?: string | null
          tarikh_jatuh_tempo: string
          user_id: string
        }
        Update: {
          bil?: number
          id?: string
          jumlah?: number
          pinjaman_id?: string
          status?: string
          tarikh_dibayar?: string | null
          tarikh_jatuh_tempo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ansuran_pinjaman_id_fkey"
            columns: ["pinjaman_id"]
            isOneToOne: false
            referencedRelation: "pinjaman"
            referencedColumns: ["id"]
          },
        ]
      }
      log_audit: {
        Row: {
          butiran: Json
          created_at: string
          entiti: string
          entiti_id: string | null
          id: string
          pelaku: string | null
          tindakan: string
        }
        Insert: {
          butiran?: Json
          created_at?: string
          entiti: string
          entiti_id?: string | null
          id?: string
          pelaku?: string | null
          tindakan: string
        }
        Update: {
          butiran?: Json
          created_at?: string
          entiti?: string
          entiti_id?: string | null
          id?: string
          pelaku?: string | null
          tindakan?: string
        }
        Relationships: []
      }
      notifikasi: {
        Row: {
          created_at: string
          dibaca: boolean
          id: string
          jenis: string
          mesej: string
          pautan: string | null
          tajuk: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dibaca?: boolean
          id?: string
          jenis: string
          mesej: string
          pautan?: string | null
          tajuk: string
          user_id: string
        }
        Update: {
          created_at?: string
          dibaca?: boolean
          id?: string
          jenis?: string
          mesej?: string
          pautan?: string | null
          tajuk?: string
          user_id?: string
        }
        Relationships: []
      }
      permohonan: {
        Row: {
          alamat: string
          catatan_admin: string | null
          created_at: string
          diputuskan_oleh: string | null
          emel: string
          foto_kp_path: string
          foto_selfie_path: string
          foto_slip_gaji_path: string | null
          kontak_darurat: Json
          gaji_bulanan: number
          had_kredit: number | null
          id: string
          jumlah_dipohon: number | null
          keputusan_dilihat: boolean
          majikan: string
          nama_penuh: string
          no_kad_pengenalan: string
          no_telefon: string
          pekerjaan: string
          pengalaman_tahun: number
          sebab_tolak: string | null
          status: string
          tarikh_keputusan: string | null
          tujuan: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alamat: string
          catatan_admin?: string | null
          created_at?: string
          diputuskan_oleh?: string | null
          emel: string
          foto_kp_path: string
          foto_selfie_path: string
          foto_slip_gaji_path: string | null
          kontak_darurat?: Json
          gaji_bulanan: number
          had_kredit?: number | null
          id?: string
          jumlah_dipohon: number | null
          keputusan_dilihat?: boolean
          majikan?: string
          nama_penuh: string
          no_kad_pengenalan: string
          no_telefon: string
          pekerjaan: string
          pengalaman_tahun?: number
          sebab_tolak?: string | null
          status?: string
          tarikh_keputusan?: string | null
          tujuan: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alamat?: string
          catatan_admin?: string | null
          created_at?: string
          diputuskan_oleh?: string | null
          emel?: string
          foto_kp_path?: string
          foto_selfie_path?: string
          foto_slip_gaji_path?: string | null
          kontak_darurat?: Json
          gaji_bulanan?: number
          had_kredit?: number | null
          id?: string
          jumlah_dipohon?: number | null
          keputusan_dilihat?: boolean
          majikan?: string
          nama_penuh?: string
          no_kad_pengenalan?: string
          no_telefon?: string
          pekerjaan?: string
          pengalaman_tahun?: number
          sebab_tolak?: string | null
          status?: string
          tarikh_keputusan?: string | null
          tujuan?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pinjaman: {
        Row: {
          catatan_admin: string | null
          created_at: string
          id: string
          jumlah_dibayar: number
          jumlah_faedah: number
          jumlah_kewajipan: number
          jumlah_pokok: number
          jumlah_yuran: number
          kadar_faedah_bulanan: number
          nama_bank: string
          nama_pemegang_akaun: string
          no_akaun: string
          permohonan_id: string
          rujukan_pencairan: string | null
          status: string
          tarikh_dicairkan: string | null
          tarikh_selesai: string | null
          tenor_bulan: number
          updated_at: string
          user_id: string
          yuran_pemprosesan: number
        }
        Insert: {
          catatan_admin?: string | null
          created_at?: string
          id?: string
          jumlah_dibayar?: number
          jumlah_faedah: number
          jumlah_kewajipan: number
          jumlah_pokok: number
          jumlah_yuran: number
          kadar_faedah_bulanan: number
          nama_bank: string
          nama_pemegang_akaun: string
          no_akaun: string
          permohonan_id: string
          rujukan_pencairan?: string | null
          status?: string
          tarikh_dicairkan?: string | null
          tarikh_selesai?: string | null
          tenor_bulan: number
          updated_at?: string
          user_id: string
          yuran_pemprosesan: number
        }
        Update: {
          catatan_admin?: string | null
          created_at?: string
          id?: string
          jumlah_dibayar?: number
          jumlah_faedah?: number
          jumlah_kewajipan?: number
          jumlah_pokok?: number
          jumlah_yuran?: number
          kadar_faedah_bulanan?: number
          nama_bank?: string
          nama_pemegang_akaun?: string
          no_akaun?: string
          permohonan_id?: string
          rujukan_pencairan?: string | null
          status?: string
          tarikh_dicairkan?: string | null
          tarikh_selesai?: string | null
          tenor_bulan?: number
          updated_at?: string
          user_id?: string
          yuran_pemprosesan?: number
        }
        Relationships: [
          {
            foreignKeyName: "pinjaman_permohonan_id_fkey"
            columns: ["permohonan_id"]
            isOneToOne: false
            referencedRelation: "permohonan"
            referencedColumns: ["id"]
          },
        ]
      }
      produk_pinjaman: {
        Row: {
          denda_lewat: number
          id: number
          jumlah_maksimum: number
          jumlah_minimum: number
          kadar_faedah_bulanan: number
          nama: string
          pilihan_tenor: number[]
          syarat: string
          updated_at: string
          yuran_pemprosesan: number
        }
        Insert: {
          denda_lewat?: number
          id?: number
          jumlah_maksimum?: number
          jumlah_minimum?: number
          kadar_faedah_bulanan?: number
          nama?: string
          pilihan_tenor?: number[]
          syarat?: string
          updated_at?: string
          yuran_pemprosesan?: number
        }
        Update: {
          denda_lewat?: number
          id?: number
          jumlah_maksimum?: number
          jumlah_minimum?: number
          kadar_faedah_bulanan?: number
          nama?: string
          pilihan_tenor?: number[]
          syarat?: string
          updated_at?: string
          yuran_pemprosesan?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          emel: string | null
          id: string
          nama_penuh: string | null
          no_telefon: string | null
        }
        Insert: {
          created_at?: string
          emel?: string | null
          id: string
          nama_penuh?: string | null
          no_telefon?: string | null
        }
        Update: {
          created_at?: string
          emel?: string | null
          id?: string
          nama_penuh?: string | null
          no_telefon?: string | null
        }
        Relationships: []
      }
      transaksi: {
        Row: {
          ansuran_id: string | null
          catatan: string | null
          created_at: string
          disahkan_pada: string | null
          id: string
          jumlah: number
          mode: string
          penyedia: string | null
          pinjaman_id: string
          rujukan_gateway: string | null
          status: string
          updated_at: string
          url_bayaran: string | null
          user_id: string
        }
        Insert: {
          ansuran_id?: string | null
          catatan?: string | null
          created_at?: string
          disahkan_pada?: string | null
          id?: string
          jumlah: number
          mode?: string
          penyedia?: string | null
          pinjaman_id: string
          rujukan_gateway?: string | null
          status?: string
          updated_at?: string
          url_bayaran?: string | null
          user_id: string
        }
        Update: {
          ansuran_id?: string | null
          catatan?: string | null
          created_at?: string
          disahkan_pada?: string | null
          id?: string
          jumlah?: number
          mode?: string
          penyedia?: string | null
          pinjaman_id?: string
          rujukan_gateway?: string | null
          status?: string
          updated_at?: string
          url_bayaran?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaksi_ansuran_id_fkey"
            columns: ["ansuran_id"]
            isOneToOne: false
            referencedRelation: "ansuran"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaksi_pinjaman_id_fkey"
            columns: ["pinjaman_id"]
            isOneToOne: false
            referencedRelation: "pinjaman"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _audit: {
        Args: {
          _butiran: Json
          _entiti: string
          _id: string
          _tindakan: string
        }
        Returns: undefined
      }
      _notis: {
        Args: {
          _jenis: string
          _mesej: string
          _pautan: string
          _tajuk: string
          _u: string
        }
        Returns: undefined
      }
      _wajib_admin: { Args: never; Returns: undefined }
      admin_hantar_notifikasi: {
        Args: { _mesej: string; _tajuk: string; _user: string }
        Returns: undefined
      }
      admin_kemaskini_produk: {
        Args: {
          _denda: number
          _kadar: number
          _max: number
          _min: number
          _syarat: string
          _tenor: number[]
          _yuran: number
        }
        Returns: undefined
      }
      admin_keputusan: {
        Args: {
          _catatan: string
          _had: number
          _id: string
          _sebab: string
          _status: string
        }
        Returns: undefined
      }
      admin_proses_pencairan: {
        Args: {
          _catatan: string
          _id: string
          _lulus: boolean
          _rujukan: string
        }
        Returns: undefined
      }
      admin_rekod_bayaran: {
        Args: { _catatan: string; _jumlah: number; _pinjaman_id: string; _rujukan: string }
        Returns: undefined
      }
      admin_tetap_admin: {
        Args: { _admin: boolean; _user: string }
        Returns: undefined
      }
      cipta_transaksi: {
        Args: { _ansuran_id: string; _mode: string }
        Returns: {
          ansuran_id: string | null
          catatan: string | null
          created_at: string
          disahkan_pada: string | null
          id: string
          jumlah: number
          mode: string
          penyedia: string | null
          pinjaman_id: string
          rujukan_gateway: string | null
          status: string
          updated_at: string
          url_bayaran: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "transaksi"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      hantar_permohonan: {
        Args: {
          _alamat: string
          _foto_kp: string
          _foto_selfie: string
          _gaji: number
          _kontak_darurat: Json
          _foto_slip_gaji: string
          _majikan: string
          _nama_penuh: string
          _no_kp: string
          _no_telefon: string
          _pekerjaan: string
          _pengalaman: number
          _tujuan: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mohon_pencairan: {
        Args: {
          _akaun: string
          _bank: string
          _jumlah: number
          _pemegang: string
          _tenor: number
        }
        Returns: string
      }
      sahkan_transaksi: {
        Args: {
          _berjaya: boolean
          _id: string
          _jumlah_diterima: number
          _rujukan: string
        }
        Returns: undefined
      }
      semak_kelayakan: { Args: never; Returns: Json }
      tanda_keputusan_dilihat: { Args: { _id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "pemohon"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "pemohon"],
    },
  },
} as const
