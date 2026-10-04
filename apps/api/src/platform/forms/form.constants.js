const FORM_STATUS = Object.freeze({ DRAFT:'DRAFT', VALIDATED:'VALIDATED', PUBLISHED:'PUBLISHED', ARCHIVED:'ARCHIVED' })
const FIELD_TYPES = Object.freeze(['text','textarea','email','phone','number','integer','boolean','date','datetime','select','multiselect','reference'])
const VALIDATION_OPERATORS = Object.freeze(['min','max','min_length','max_length','equals','not_equals','in','not_in','contains','regex','matches_field'])
export { FORM_STATUS, FIELD_TYPES, VALIDATION_OPERATORS }
