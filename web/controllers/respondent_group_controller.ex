defmodule Ask.RespondentGroupController do
  use Ask.Web, :api_controller

  alias Ask.{Project, Survey, Respondent, RespondentGroup}

  def index(conn, %{"project_id" => project_id, "survey_id" => survey_id}) do
    respondent_groups = conn
    |> load_project(project_id)
    |> assoc(:surveys)
    |> Repo.get!(survey_id)
    |> assoc(:respondent_groups)
    |> Repo.all

    render(conn, "index.json", respondent_groups: respondent_groups)
  end

  def create(conn, %{"project_id" => project_id, "file" => file, "survey_id" => survey_id}) do
    project = conn
    |> load_project_for_change(project_id)

    survey = project
    |> assoc(:surveys)
    |> Repo.get!(survey_id)

    if Path.extname(file.filename) == ".csv" do
      rows =
        file.path
        |> File.read!
        |> csv_rows
        |> Enum.uniq

      invalid_entries = rows
      |> Enum.with_index
      |> Enum.map( fn {row, index} -> %{phone_number: row, line_number: index + 1} end)
      |> Enum.filter(fn entry -> !Regex.match?(~r/^([0-9]|\(|\)|\+|\-| )+$/, entry.phone_number) end)

      case invalid_entries do
        [] -> create_respondent_group(conn, survey, file.filename, rows, project)
        _ -> render_invalid(conn, file.filename, invalid_entries)
      end
    else
      render_unprocessable_entity(conn)
    end
  end

  defp csv_rows(csv_string) do
    delimiters = ["\r\n", "\r", "\n"]
    [{_, delimiter} | _] =
      delimiters
      |> Enum.map(fn d ->
          case :binary.match(csv_string, d) do
            {index, _} -> {index, d}
            _ -> {d, -1}
          end
        end)
      |> Enum.filter(fn {index, _} -> index != -1 end)
      |> Enum.sort

    # If we didn't find a delimiter it probably means
    # there's just a single line in the file.
    # In that case any delimiter, like "\n", is good.
    delimiter = case delimiter do
      -1 -> "\n"
      _  -> delimiter
    end

    csv_string
    |> String.split(delimiter)
    |> Enum.filter(fn r ->
      length = r |> String.trim |> String.split(",") |> Enum.at(0) |> String.length
      length != 0
    end)
    |> Enum.map(fn r ->
      r |> String.trim |> String.split(",") |> Enum.at(0)
    end)
  end

  defp create_respondent_group(conn, survey, filename, rows, project) do
    {:ok, local_time } = Ecto.DateTime.cast :calendar.local_time()
    survey_id = survey.id

    sample = rows |> Enum.take(5)
    respondents_count = rows |> length

    group = %RespondentGroup{
      name: filename,
      survey_id: survey_id,
      sample: sample,
      respondents_count: respondents_count
    }
    |> Repo.insert!

    entries = rows
      |> Enum.map(fn row ->
        %{phone_number: row, sanitized_phone_number: Respondent.sanitize_phone_number(row), survey_id: survey_id, respondent_group_id: group.id, inserted_at: local_time, updated_at: local_time}
      end)

    respondents_count = entries
    |> Enum.chunk(1_000, 1_000, [])
    |> Enum.reduce(0, fn(chunked_entries, total_count)  ->
        {count, _ } = Repo.insert_all(Respondent, chunked_entries)
        total_count + count
      end)

    respondents = mask_phone_numbers(Repo.all(from r in Respondent, where: r.survey_id == ^survey_id, limit: 5))

    survey |> Survey.update_state_from_respondents_count
    project |> Project.touch!

    conn
    |> put_status(:created)
    |> render("show.json", respondent_group: group)
  end

  defp render_unprocessable_entity(conn) do
    conn
    |> put_status(:unprocessable_entity)
    |> render(Ask.ChangesetView, "error.json", changeset: change(%Respondent{}, %{}))
  end

  defp render_invalid(conn, filename, invalid_entries) do
    conn
    |> put_status(:unprocessable_entity)
    |> render("invalid_entries.json", %{invalid_entries: invalid_entries, filename: filename})
  end

  defp mask_phone_numbers(respondents) do
    respondents |> Enum.map(fn respondent ->
      %{respondent | phone_number: Respondent.mask_phone_number(respondent.phone_number)}
    end)
  end

  def delete(conn, %{"project_id" => project_id, "survey_id" => survey_id, "id" => id}) do
    project = conn
    |> load_project_for_change(project_id)

    # Check that the survey is in the project
    survey = project
    |> assoc(:surveys)
    |> Repo.get!(survey_id)

    # Check that the respondent_group is in the survey
    group = survey
    |> assoc(:respondent_groups)
    |> Repo.get!(id)

    from(r in Respondent, where: r.respondent_group_id == ^id)
    |> Repo.delete_all

    group
    |> Repo.delete!

    survey |> Survey.update_state_from_respondents_count()
    project |> Project.touch!

    conn
      |> put_status(:ok)
      |> render("empty.json", %{})
  end
end