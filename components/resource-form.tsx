import { ActionForm, Field, SubmitButton } from '@/components/form-ui';
import type { FormState } from '@/lib/controllers/form-state';
import { resourceCategories, resourceCategoryLabels, type Resource } from '@/lib/domain/resource';

type ResourceFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  resource?: Resource;
  submitLabel: string;
};

/** Formulaire de création ou de modification d'une ressource (EF-09). */
export function ResourceForm({ action, resource, submitLabel }: ResourceFormProps) {
  return (
    <ActionForm action={action}>
      <div className="form-grid">
        <Field name="name" label="Nom" required maxLength={100} defaultValue={resource?.name} />
        <Field
          name="category"
          label="Catégorie"
          as="select"
          required
          defaultValue={resource?.category ?? ''}
        >
          <option value="" disabled>
            Choisir une catégorie
          </option>
          {resourceCategories.map((category) => (
            <option key={category} value={category}>
              {resourceCategoryLabels[category]}
            </option>
          ))}
        </Field>
        <div className="full">
          <Field
            name="description"
            label="Description"
            as="textarea"
            required
            maxLength={1000}
            defaultValue={resource?.description}
          />
        </div>
        <div className="full">
          <Field
            name="usageConditions"
            label="Conditions d’utilisation"
            required
            maxLength={300}
            defaultValue={resource?.usageConditions}
          />
        </div>
        <Field
          name="capacity"
          label="Capacité"
          type="number"
          min={1}
          max={500}
          hint="Nombre de personnes ou de places. Obligatoire pour les salles, le studio et le véhicule."
          defaultValue={resource?.capacity}
        />
        <Field
          name="inventoryCode"
          label="Numéro de série (matériel)"
          maxLength={50}
          hint="Lettres et chiffres, 50 caractères au plus. Un code de 6 caractères est généré s’il est laissé vide."
          defaultValue={resource?.inventoryCode}
        />
        <div className="full">
          <Field
            name="photo"
            label="Photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hint="JPEG, PNG ou WebP, 2 Mo au maximum. Sans nouvelle photo, la photo actuelle est conservée."
          />
        </div>
      </div>
      <SubmitButton pendingLabel="Enregistrement…">{submitLabel}</SubmitButton>
    </ActionForm>
  );
}
