defmodule Ask.QuestionnaireView do
  use Ask.Web, :view

  def render("index.json", %{questionnaires: questionnaires}) do
    %{data: render_many(questionnaires, Ask.QuestionnaireView, "questionnaire.json")}
  end

  def render("show.json", %{questionnaire: questionnaire}) do
    %{data: render_one(questionnaire, Ask.QuestionnaireView, "questionnaire.json")}
  end

  def render("questionnaire.json", %{questionnaire: questionnaire}) do
    %{id: questionnaire.id,
      name: questionnaire.name,
      project_id: questionnaire.project_id}
  end
end
