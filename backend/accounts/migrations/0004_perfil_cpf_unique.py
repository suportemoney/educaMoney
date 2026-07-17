# CPF único (idempotente): NULL para vazio + unique

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0003_perfil_dados_certificado"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name="perfil",
                    name="cpf",
                    field=models.CharField(
                        blank=True,
                        default=None,
                        help_text="Somente dígitos; vazio = NULL.",
                        max_length=11,
                        null=True,
                        unique=True,
                        verbose_name="CPF",
                    ),
                ),
            ],
            database_operations=[
                # Permite NULL
                migrations.RunSQL(
                    sql='ALTER TABLE accounts_perfil ALTER COLUMN cpf DROP NOT NULL;',
                    reverse_sql=migrations.RunSQL.noop,
                ),
                # "" → NULL (vários "" quebrariam UNIQUE)
                migrations.RunSQL(
                    sql="UPDATE accounts_perfil SET cpf = NULL WHERE cpf = '';",
                    reverse_sql=migrations.RunSQL.noop,
                ),
                # Unique se ainda não existir
                migrations.RunSQL(
                    sql="""
                    DO $$
                    BEGIN
                      IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint
                        WHERE conname = 'accounts_perfil_cpf_f249904e_uniq'
                      ) THEN
                        ALTER TABLE accounts_perfil
                          ADD CONSTRAINT accounts_perfil_cpf_f249904e_uniq UNIQUE (cpf);
                      END IF;
                    END $$;
                    """,
                    reverse_sql="""
                    ALTER TABLE accounts_perfil
                      DROP CONSTRAINT IF EXISTS accounts_perfil_cpf_f249904e_uniq;
                    """,
                ),
            ],
        ),
    ]
